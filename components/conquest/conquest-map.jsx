import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useClientLayoutEffect} from '../../hooks/client-layout-effect';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {geoNaturalEarth1, geoPath} from 'd3-geo';
import {feature} from 'topojson-client';
import {countryIdOf} from '../map/geo';
import {teamFill} from '../../utils/team-colour';

// The whole world at once: every country drawn, the ones this round put up for the taking lit,
// the ones already conquered flying their holder's colour.
//
// Client-only (loaded with next/dynamic): the 50m atlas is ~750 KB and d3 never runs on the
// server. The same atlas the map questions use, so it is one download for both.
const WIDTH = 960;

// The inhabited world rather than the whole sphere: fitting a sphere means fitting Antarctica and
// the empty polar ocean too, which sets the scale by a band nobody conquers.
//
// It stops 8 degrees short of the antimeridian at both ends, which trims the emptiest water on
// the map. That costs Tonga, Samoa and Wallis and Futuna in the west and nothing at all in the
// east — and it keeps the corners off 180 exactly, where a polygon is ambiguous about which way
// round the globe it goes and d3 measures it as a different shape entirely.
const INHABITED = {
    type: 'Polygon',
    coordinates: [[[-172, 80], [172, 80], [172, -56], [-172, -56], [-172, 80]]],
};

// The map takes the window's remaining height, down to this and no further; and leaves this much
// room below itself so the page does not end flush against the bottom of the screen.
const MIN_HEIGHT = 300;
const BOTTOM_GAP = 10;

// The world is one shape and the frame is another, so one of them has to give: the map is scaled
// between these two bounds and whatever is left over is either sea at the sides or latitude off
// the top and bottom.
//
// Scaled up past the frame's width, the Pacific edges go over the sides. 1.11 stops at about 155
// degrees east and west, which is Australia's east coast — past that it starts eating countries.
//
// Scaled down below it, sea appears at the sides instead. 0.89 is as far down as it goes, which
// on a short window trims to about 72N and 48S: Norway and Iceland stay on, and so does every
// country the sample ships. A window shorter than that trims further.
const MAX_CROP = 1.11;
const MIN_FILL = 0.89;

// A country the game knows nothing about is still drawn — it is the world, not a game board.
const stateOf = (entry, selectedCode) => {
    if (!entry) return 'outside';
    if (entry.code === selectedCode) return 'selected';
    if (entry.open) return 'open';
    return entry.heldBy ? 'held' : 'idle';
};

export default function ConquestMap({countries = [], selectedCode, onSelect}) {
    const {t} = useTranslation();
    const [topology, setTopology] = useState(null);
    // The viewBox height, in the same units as WIDTH: the frame's own shape, so a tall frame
    // shows the world bigger rather than letterboxed inside it.
    const [viewHeight, setViewHeight] = useState(Math.round(WIDTH / 2.32));
    const frameRef = useRef(null);

    useEffect(() => {
        let current = true;
        import('world-atlas/countries-50m.json').then(module => current && setTopology(module.default ?? module));
        return () => {
            current = false;
        };
    }, []);

    // Size the frame to what is left of the window, measured from where the frame actually sits,
    // so the hero above it and the legend below it are taken off without either being hardcoded.
    useClientLayoutEffect(() => {
        const fit = () => {
            const frame = frameRef.current;
            if (!frame) return;
            const rect = frame.getBoundingClientRect();
            const below = frame.parentElement.getBoundingClientRect().bottom - rect.bottom;
            const available = window.innerHeight - (rect.top + window.scrollY) - below - BOTTOM_GAP;

            frame.style.height = `${Math.round(Math.max(MIN_HEIGHT, available))}px`;
            // viewBox units follow the frame's shape, so nothing is stretched.
            setViewHeight(Math.round(WIDTH * frame.clientHeight / rect.width));
        };

        fit();
        window.addEventListener('resize', fit);
        return () => window.removeEventListener('resize', fit);
    }, [topology]);

    // The game's countries by the numeric id the atlas draws its shapes under. A country whose
    // natural id is not an ISO3 the atlas knows is simply not on the map; the list beside it
    // still reaches the quiz, so a mistyped code loses the shape and not the game.
    const byShapeId = useMemo(() => {
        const entries = new Map();
        countries.forEach(country => {
            const shapeId = countryIdOf(country.code);
            if (shapeId) entries.set(shapeId, country);
        });
        return entries;
    }, [countries]);

    const land = useMemo(() => {
        if (!topology) return null;
        const shapes = feature(topology, topology.objects.countries).features;

        // Sized to the frame's height, within the bounds above: a tall frame scales the map up
        // and lets the Pacific edges go over the sides, a short one scales it down until the
        // land fits, rather than either being boxed into a shape it is not.
        const natural = geoNaturalEarth1().fitWidth(WIDTH, INHABITED);
        const [, [, naturalHeight]] = geoPath(natural).bounds(INHABITED);
        const width = Math.min(
            Math.max(WIDTH * viewHeight / naturalHeight, WIDTH * MIN_FILL),
            WIDTH * MAX_CROP);

        const projection = geoNaturalEarth1().fitWidth(width, INHABITED);
        const path = geoPath(projection);
        // Centre what was fitted inside the viewBox, so whatever spills goes evenly both sides.
        const [[left, top], [right, bottom]] = path.bounds(INHABITED);
        const [x, y] = projection.translate();
        projection.translate([
            x + (WIDTH - (right - left)) / 2 - left,
            y + (viewHeight - (bottom - top)) / 2 - top,
        ]);

        const centred = geoPath(projection);
        return shapes.map(shape => ({id: shape.id, d: centred(shape), entry: byShapeId.get(shape.id)}));
    }, [topology, byShapeId, viewHeight]);

    return (
        <div className='conquest-map-viewport' ref={frameRef}>
            {!land ? (
                <div className='map-loading' aria-busy='true'>{t('loading_map', 'Loading map…')}</div>
            ) : (
                <svg viewBox={`0 0 ${WIDTH} ${viewHeight}`} className='conquest-map' role='group'
                     aria-label={t('conquest_map', 'The conquest map')}>
                    <defs>
                        <radialGradient id='conquest-ocean' cx='50%' cy='40%' r='75%'>
                            <stop offset='0%' stopColor='#0b2a3c'/>
                            <stop offset='100%' stopColor='#030b11'/>
                        </radialGradient>
                    </defs>

                    {/* The ocean as a plain rectangle, not the projected sphere: cropping the
                        poles cuts the corners off that outline and the page would show through. */}
                    <rect className='conquest-sphere' width={WIDTH} height={viewHeight}/>

                    {land.map(({id, d, entry}, index) => {
                        const state = stateOf(entry, selectedCode);
                        if (!entry) {
                            return <path key={`${id}-${index}`} className='conquest-country' data-state={state} d={d}/>;
                        }

                        // A country in the game is a button: clicking it opens its panel, whether
                        // or not it can be taken, so a player can always see who holds what.
                        return (
                            <path key={`${id}-${index}`}
                                  className='conquest-country'
                                  data-state={state}
                                  // A held country flies its holder's team colour; open and
                                  // selected keep theirs, being what the player acts on now.
                                  data-team={entry.team ? true : undefined}
                                  style={entry.team ? {'--team-fill': teamFill(entry.team.id)} : undefined}
                                  d={d}
                                  role='button'
                                  tabIndex={0}
                                  aria-label={entry.heldBy
                                      ? t('conquest_held_by', '{{country}}, held by {{player}}',
                                          {country: entry.name, player: entry.heldBy.displayName})
                                        + (entry.team?.name ? ` (${entry.team.name})` : '')
                                      : entry.name}
                                  aria-pressed={entry.code === selectedCode}
                                  onClick={() => onSelect(entry.code)}
                                  onKeyDown={(event) => {
                                      if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          onSelect(entry.code);
                                      }
                                  }}>
                                <title>{entry.name}</title>
                            </path>
                        );
                    })}
                </svg>
            )}
        </div>
    );
}

ConquestMap.propTypes = {
    countries: PropTypes.array,
    selectedCode: PropTypes.string,
    onSelect: PropTypes.func,
};
