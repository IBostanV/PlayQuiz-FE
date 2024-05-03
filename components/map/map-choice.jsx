import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useClientLayoutEffect} from '../../hooks/client-layout-effect';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {geoArea, geoGraticule10, geoNaturalEarth1, geoPath} from 'd3-geo';
import {feature, merge} from 'topojson-client';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faExpand, faMinus, faPlus} from '@fortawesome/free-solid-svg-icons';
import {countryInfo, optionLetter, placeOptions} from './geo';

// Map question: the answer options are places (countries, continents or cities), lit on a dark
// world map as A, B, C… The player picks one and confirms. Names are never shown on the map,
// only letters, so "where is Moldova?" stays a geography question and not a reading one.
//
// Client-only (loaded with next/dynamic): the 50m atlas is ~750 KB, so it is fetched only when
// a map question appears, and d3/topojson never run on the server.

// The viewBox is always 960 wide; its height follows the frame's shape (16:9 at most), so a
// short, wide frame shows more world sideways instead of a letterboxed 16:9 map.
const WIDTH = 960;
const MAX_HEIGHT = 540;
// The frame fits the screen with the question above and the options and confirm below it,
// but never gets shorter than this; and leaves this much room under the confirm button.
const MIN_FRAME_HEIGHT = 240;
const BOTTOM_GAP = 24;
const PAD = 48;
const MAX_ZOOM = 8;
// Never zoom in further than this many times the whole-world scale: a single small country
// would otherwise fill the frame with no surroundings to recognise it by.
const MAX_FIT = 7;
// After fitting to the options, step back a little so their neighbours show too.
const CONTEXT = 0.82;

// A MultiPolygon's biggest part: France's mainland, not French Guiana. Countries are framed
// and labelled by it, so an overseas territory does not zoom the map out to another continent.
const mainland = (shape) => {
    const geometry = shape.geometry ?? shape;
    if (geometry.type !== 'MultiPolygon') return geometry;
    const parts = geometry.coordinates.map(coordinates => ({type: 'Polygon', coordinates}));
    return parts.reduce((best, part) => (geoArea(part) > geoArea(best) ? part : best));
};

// Frames the options: fitted to them, eased back for context, capped so it never over-zooms.
const makeProjection = (targets, height) => {
    const world = geoNaturalEarth1().fitExtent([[8, 8], [WIDTH - 8, height - 8]], {type: 'Sphere'});
    if (!targets.length) return world;

    const projection = geoNaturalEarth1().fitExtent([[PAD, PAD], [WIDTH - PAD, height - PAD]],
        {type: 'FeatureCollection', features: targets});
    const center = projection.invert([WIDTH / 2, height / 2]);
    const scale = Math.max(world.scale(), Math.min(projection.scale() * CONTEXT, world.scale() * MAX_FIT));
    return geoNaturalEarth1().scale(scale).center(center).translate([WIDTH / 2, height / 2]);
};

export default function MapChoice({options, level, onConfirm, busy}) {
    const {t} = useTranslation();
    const [topology, setTopology] = useState(null);
    const [selected, setSelected] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState([0, 0]);
    const [viewHeight, setViewHeight] = useState(MAX_HEIGHT);
    const [frameHeight, setFrameHeight] = useState(null);
    const svgRef = useRef(null);
    const frameRef = useRef(null);
    const drag = useRef(null);

    // Size the frame to what is left of the window (measured from the top of the page), so the
    // question, map, options and confirm button fit on one screen.
    useClientLayoutEffect(() => {
        const fit = () => {
            const frame = frameRef.current;
            const rect = frame.getBoundingClientRect();
            const below = frame.parentElement.getBoundingClientRect().bottom - rect.bottom;
            const available = window.innerHeight - (rect.top + window.scrollY) - below - BOTTOM_GAP;
            const height = Math.max(MIN_FRAME_HEIGHT, Math.min(available, rect.width * MAX_HEIGHT / WIDTH));
            setFrameHeight(Math.round(height));
            setViewHeight(Math.round(WIDTH * height / rect.width));
        };
        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, []);

    useEffect(() => {
        let current = true;
        import('world-atlas/countries-50m.json').then(module => current && setTopology(module.default ?? module));
        return () => {
            current = false;
        };
    }, []);

    const places = useMemo(() => placeOptions(options, level), [options, level]);

    const scene = useMemo(() => {
        if (!topology) return null;
        const countries = feature(topology, topology.objects.countries).features;

        // The shape each option stands for: a country, or a continent merged from its countries.
        const shapeOf = (place) => {
            if (level === 'country') return countries.find(country => country.id === place.placeId);
            if (level === 'continent') {
                const geometries = topology.objects.countries.geometries
                    .filter(geometry => countryInfo(geometry.id)?.continent === place.placeId);
                return {type: 'Feature', geometry: merge(topology, geometries)};
            }
            return {type: 'Feature', geometry: {type: 'Point', coordinates: place.point}};
        };

        const targets = places.map(place => ({place, shape: shapeOf(place)})).filter(target => target.shape);
        const projection = makeProjection(targets.map(target => (level === 'country'
            ? {type: 'Feature', geometry: mainland(target.shape)} : target.shape)), viewHeight);
        const path = geoPath(projection);

        return {
            sphere: path({type: 'Sphere'}),
            graticule: path(geoGraticule10()),
            land: countries.map(country => ({id: country.id ?? country.properties?.name, d: path(country)})),
            candidates: targets.map(({place, shape}) => level === 'city'
                ? {place, point: projection(place.point)}
                : {place, d: path(shape), label: path.centroid(mainland(shape))}),
        };
    }, [topology, places, level, viewHeight]);

    // ---- Zoom (buttons) and pan (drag), in viewBox units, around the frame's centre ---------

    const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(1, value));
    const zoomBy = (factor) => setZoom(value => {
        const next = clampZoom(value * factor);
        if (next === 1) setPan([0, 0]);
        return next;
    });
    const reset = () => {
        setZoom(1);
        setPan([0, 0]);
    };

    const onPointerDown = (event) => {
        if (zoom === 1 || event.button !== 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        drag.current = {x: event.clientX, y: event.clientY, pan, ratio: WIDTH / rect.width, moved: false};
    };
    const onPointerMove = (event) => {
        const start = drag.current;
        if (!start) return;
        const dx = (event.clientX - start.x) * start.ratio;
        const dy = (event.clientY - start.y) * start.ratio;
        if (!start.moved && Math.abs(dx) + Math.abs(dy) > 4) {
            start.moved = true;
            // Captured only once it is a real drag: capturing on press would send the click to
            // the <svg> instead of the region under the pointer.
            event.currentTarget.setPointerCapture(event.pointerId);
        }
        if (start.moved) setPan([start.pan[0] + dx, start.pan[1] + dy]);
    };
    const onPointerUp = () => {
        // A drag that moved is not a click: keep it from selecting whatever it ended on.
        setTimeout(() => {
            drag.current = null;
        });
    };

    const choose = (termId) => {
        if (busy || drag.current?.moved) return;
        setSelected(termId);
    };

    const onRegionKey = (event, termId) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            choose(termId);
        }
    };

    const transform = `translate(${WIDTH / 2 + pan[0]} ${viewHeight / 2 + pan[1]}) scale(${zoom}) translate(${-WIDTH / 2} ${-viewHeight / 2})`;
    const letterOf = (termId) => optionLetter(places.findIndex(place => place.termId === termId));

    return (
        <div className='map-choice'>
            <div className='map-frame' ref={frameRef} data-zoomed={zoom > 1} data-level={level}
                 style={frameHeight ? {height: frameHeight} : undefined}>
                {!scene ? (
                    <div className='map-loading' aria-busy='true'>{t('loading_map', 'Loading map…')}</div>
                ) : (
                    <svg ref={svgRef}
                         viewBox={`0 0 ${WIDTH} ${viewHeight}`}
                         className='map-svg'
                         role='radiogroup'
                         aria-label={t('map_options', 'Answer options on the map')}
                         onPointerDown={onPointerDown}
                         onPointerMove={onPointerMove}
                         onPointerUp={onPointerUp}
                         onPointerCancel={onPointerUp}>
                        <defs>
                            <radialGradient id='map-ocean' cx='50%' cy='40%' r='75%'>
                                <stop offset='0%' stopColor='#0b2a3c'/>
                                <stop offset='100%' stopColor='#030b11'/>
                            </radialGradient>
                            <linearGradient id='map-pick' x1='0' y1='0' x2='1' y2='1'>
                                <stop offset='0%' style={{stopColor: 'var(--ui-accent-bright)'}}/>
                                <stop offset='100%' style={{stopColor: 'var(--ui-accent-dark)'}}/>
                            </linearGradient>
                            <filter id='map-glow' x='-50%' y='-50%' width='200%' height='200%'>
                                <feGaussianBlur stdDeviation='4' result='blur'/>
                                <feMerge>
                                    <feMergeNode in='blur'/>
                                    <feMergeNode in='SourceGraphic'/>
                                </feMerge>
                            </filter>
                        </defs>

                        <g transform={transform}>
                            <path className='map-sphere' d={scene.sphere}/>
                            <path className='map-graticule' d={scene.graticule}/>
                            {scene.land.map((country, index) => (
                                <path key={`${country.id}-${index}`} className='map-land' d={country.d}/>
                            ))}

                            {scene.candidates.map(({place, d, label, point}, index) => {
                                const state = selected === place.termId ? 'selected' : 'candidate';
                                const regionProps = {
                                    role: 'radio',
                                    tabIndex: 0,
                                    'aria-checked': selected === place.termId,
                                    'aria-label': t('map_option', 'Option {{letter}}', {letter: optionLetter(index)}),
                                    'data-state': state,
                                    onClick: () => choose(place.termId),
                                    onKeyDown: (event) => onRegionKey(event, place.termId),
                                };

                                return point ? (
                                    <g key={place.termId} className='map-city' transform={`translate(${point[0]} ${point[1]})`}
                                       {...regionProps}>
                                        <circle className='map-city-pulse' r='14'/>
                                        <circle className='map-city-hit' r='16'/>
                                        <circle className='map-city-dot' r='6'/>
                                        <text className='map-badge-text' y='-16'>{optionLetter(index)}</text>
                                    </g>
                                ) : (
                                    <g key={place.termId}>
                                        <path className='map-region' d={d} {...regionProps}/>
                                        <g className='map-badge' data-state={state}
                                           transform={`translate(${label[0]} ${label[1]})`} aria-hidden>
                                            <circle r='11'/>
                                            <text className='map-badge-text' dy='0.35em'>{optionLetter(index)}</text>
                                        </g>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                )}

                {scene && (
                    <div className='map-controls'>
                        <button type='button' onClick={() => zoomBy(1.5)} disabled={zoom >= MAX_ZOOM}
                                aria-label={t('zoom_in', 'Zoom in')} data-tooltip={t('zoom_in', 'Zoom in')}
                                data-tooltip-placement='left'>
                            <FontAwesomeIcon icon={faPlus}/>
                        </button>
                        <button type='button' onClick={() => zoomBy(1 / 1.5)} disabled={zoom <= 1}
                                aria-label={t('zoom_out', 'Zoom out')} data-tooltip={t('zoom_out', 'Zoom out')}
                                data-tooltip-placement='left'>
                            <FontAwesomeIcon icon={faMinus}/>
                        </button>
                        <button type='button' onClick={reset} disabled={zoom === 1}
                                aria-label={t('reset_view', 'Reset view')} data-tooltip={t('reset_view', 'Reset view')}
                                data-tooltip-placement='left'>
                            <FontAwesomeIcon icon={faExpand}/>
                        </button>
                    </div>
                )}
                {zoom > 1 && <span className='map-hint'>{t('map_drag_hint', 'Drag to move the map')}</span>}
            </div>

            {/* The same choices as buttons: for keyboards, screen readers and tiny places. */}
            <div className='map-options' role='radiogroup' aria-label={t('map_options', 'Answer options on the map')}>
                {places.map((place, index) => (
                    <button key={place.termId} type='button' className='map-option' role='radio'
                            aria-checked={selected === place.termId} disabled={busy}
                            onClick={() => choose(place.termId)}>
                        {optionLetter(index)}
                    </button>
                ))}
            </div>

            <button type='button' className='map-confirm' disabled={selected == null || busy}
                    onClick={() => onConfirm(selected)}>
                <FontAwesomeIcon icon={faCheck}/>
                {selected == null
                    ? t('map_pick', 'Pick a place on the map')
                    : t('map_confirm', 'Confirm {{letter}}', {letter: letterOf(selected)})}
            </button>
        </div>
    );
}

MapChoice.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({
        termId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        glossaryKey: PropTypes.string,
        glossaryOptions: PropTypes.string,
    })),
    level: PropTypes.oneOf(['country', 'continent', 'city']),
    onConfirm: PropTypes.func,
    busy: PropTypes.bool,
};
