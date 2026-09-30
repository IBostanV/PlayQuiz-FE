import React from 'react';

// Every IQ item is made of these figures, drawn from the spec the server sends:
//   s shape, f fill (none | solid | half), n how many, r rotation in degrees, z size (s | m | l)
// Shapes rather than words on purpose: a reasoning test should ask the same question of a player
// whatever language they read in.

const RADIUS = {s: 13, m: 19, l: 25};

// Where the copies sit in the 100x100 box, so two figures with the same count line up across a row.
const LAYOUTS = {
    1: [[50, 50]],
    2: [[31, 50], [69, 50]],
    3: [[50, 29], [29, 69], [71, 69]],
    4: [[31, 31], [69, 31], [31, 69], [69, 69]],
};

// A regular polygon on its point, which is how these shapes are usually drawn.
const polygon = (sides, cx, cy, radius, offset = -90) => Array.from({length: sides}, (unused, index) => {
    const angle = (offset + index * 360 / sides) * Math.PI / 180;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

const star = (cx, cy, radius) => Array.from({length: 10}, (unused, index) => {
    const reach = index % 2 === 0 ? radius : radius * 0.45;
    const angle = (-90 + index * 36) * Math.PI / 180;
    return `${(cx + reach * Math.cos(angle)).toFixed(1)},${(cy + reach * Math.sin(angle)).toFixed(1)}`;
}).join(' ');

const shapeOf = (shape, cx, cy, radius, paint) => {
    switch (shape) {
        case 'circle':
            return <circle cx={cx} cy={cy} r={radius} {...paint}/>;
        case 'square':
            return <rect x={cx - radius * 0.86} y={cy - radius * 0.86}
                         width={radius * 1.72} height={radius * 1.72} {...paint}/>;
        case 'triangle':
            return <polygon points={polygon(3, cx, cy, radius)} {...paint}/>;
        case 'diamond':
            return <polygon points={polygon(4, cx, cy, radius)} {...paint}/>;
        case 'hex':
            return <polygon points={polygon(6, cx, cy, radius)} {...paint}/>;
        case 'star':
            return <polygon points={star(cx, cy, radius)} {...paint}/>;
        case 'cross':
            return <path {...paint} d={`M${cx - radius * 0.3} ${cy - radius} h${radius * 0.6}`
                + ` v${radius * 0.7} h${radius * 0.7} v${radius * 0.6} h${-radius * 0.7}`
                + ` v${radius * 0.7} h${-radius * 0.6} v${-radius * 0.7} h${-radius * 0.7}`
                + ` v${-radius * 0.6} h${radius * 0.7} z`}/>;
        default:
            return null;
    }
};

// One figure: the spec drawn into its own square box, sized by the container.
export const Figure = ({spec, className = ''}) => {
    if (!spec) return null;

    const places = LAYOUTS[spec.n] ?? LAYOUTS[1];
    // Copies shrink so that four of them still fit the box a single one fills.
    const radius = (RADIUS[spec.z] ?? RADIUS.m) * (places.length > 1 ? 0.56 : 1);
    // The half fill is a hard-stopped gradient: two flat halves, no blend to read as shading.
    const fillId = `iq-half-${spec.s}`;
    // A style, not attributes: the colour is the player's accent, and only a style can hold a variable.
    const paint = {
        style: {
            fill: spec.f === 'solid' ? 'var(--ui-accent-light)' : spec.f === 'half' ? `url(#${fillId})` : 'none',
            stroke: 'var(--ui-accent-light)',
            strokeWidth: 2.5,
            strokeLinejoin: 'round',
        },
    };

    return (
        <svg className={`iq-figure ${className}`.trim()} viewBox='0 0 100 100' aria-hidden focusable='false'>
            {spec.f === 'half' && (
                <defs>
                    <linearGradient id={fillId} x1='0' x2='1' y1='0' y2='0'>
                        <stop offset='50%' style={{stopColor: 'var(--ui-accent-light)'}}/>
                        <stop offset='50%' stopColor='transparent'/>
                    </linearGradient>
                </defs>
            )}
            <g transform={`rotate(${spec.r ?? 0} 50 50)`}>
                {places.map(([cx, cy], index) => (
                    <g key={index}>{shapeOf(spec.s, cx, cy, radius, paint)}</g>
                ))}
            </g>
        </svg>
    );
};
