import React, {useEffect, useRef, useState} from 'react';
import {useClientLayoutEffect} from '../../hooks/client-layout-effect';
import {createPortal} from 'react-dom';

// One tooltip for the whole app. Any element with data-tooltip="…" gets it on hover (after a
// short delay) or keyboard focus (at once); data-tooltip-placement="bottom|left|right" moves it
// off the default top. It flips to the other side when there is no room and stays inside the
// viewport. Mounted once in _app, so the rest of the code only adds attributes.
//
// Why one global layer rather than wrapping every button: nothing to import or wrap, and the
// bubble renders in a portal, so overflow/clip-path on the button's containers cannot cut it.
// Inside an open modal <dialog> it renders into that dialog: the top layer covers everything
// portalled to <body>.

const SHOW_DELAY = 350;
const GAP = 10;
const EDGE = 8;
const OPPOSITE = {top: 'bottom', bottom: 'top', left: 'right', right: 'left'};

// Where the bubble goes for `placement`, as viewport coordinates of its top-left corner.
const place = (placement, target, bubble) => {
    switch (placement) {
        case 'bottom': return {x: target.left + target.width / 2 - bubble.width / 2, y: target.bottom + GAP};
        case 'left': return {x: target.left - bubble.width - GAP, y: target.top + target.height / 2 - bubble.height / 2};
        case 'right': return {x: target.right + GAP, y: target.top + target.height / 2 - bubble.height / 2};
        default: return {x: target.left + target.width / 2 - bubble.width / 2, y: target.top - bubble.height - GAP};
    }
};

const fits = ({x, y}, bubble) => x >= EDGE && y >= EDGE
    && x + bubble.width <= window.innerWidth - EDGE
    && y + bubble.height <= window.innerHeight - EDGE;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

export const TooltipLayer = () => {
    const [tip, setTip] = useState(null);
    const bubbleRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const findTarget = (node) => node instanceof Element ? node.closest('[data-tooltip]') : null;

        const show = (target) => {
            const text = target.getAttribute('data-tooltip');
            if (!text) return;
            // Inside an open modal the bubble must live in the dialog, or it renders underneath.
            const container = target.closest('dialog[open]') ?? document.body;
            setTip({target, text, container, placement: target.getAttribute('data-tooltip-placement') || 'top'});
        };

        const hide = () => {
            clearTimeout(timerRef.current);
            setTip(null);
        };

        const onPointerOver = (event) => {
            if (event.pointerType === 'touch') return;
            const target = findTarget(event.target);
            if (!target) return;
            clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => show(target), SHOW_DELAY);
        };

        const onPointerOut = (event) => {
            const target = findTarget(event.target);
            // Moving between an element's own children is not leaving it.
            if (target && !target.contains(event.relatedTarget)) hide();
        };

        // Keyboard focus shows it straight away; a mouse click's focus does not.
        const onFocusIn = (event) => {
            const target = findTarget(event.target);
            if (target && target.matches(':focus-visible')) show(target);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') hide();
        };

        document.addEventListener('pointerover', onPointerOver);
        document.addEventListener('pointerout', onPointerOut);
        document.addEventListener('pointerdown', hide);
        document.addEventListener('focusin', onFocusIn);
        document.addEventListener('focusout', hide);
        document.addEventListener('keydown', onKeyDown);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);

        return () => {
            clearTimeout(timerRef.current);
            document.removeEventListener('pointerover', onPointerOver);
            document.removeEventListener('pointerout', onPointerOut);
            document.removeEventListener('pointerdown', hide);
            document.removeEventListener('focusin', onFocusIn);
            document.removeEventListener('focusout', hide);
            document.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, []);

    // Positioned after render, once the bubble's size is known; flips when the preferred side
    // does not fit, then clamps into the viewport.
    useClientLayoutEffect(() => {
        const bubble = bubbleRef.current;
        if (!tip || !bubble) return;

        // The target may have been removed or hidden since the hover started.
        if (!tip.target.isConnected) {
            setTip(null);
            return;
        }

        const target = tip.target.getBoundingClientRect();
        const size = bubble.getBoundingClientRect();
        let placement = tip.placement;
        let spot = place(placement, target, size);
        if (!fits(spot, size)) {
            const flipped = place(OPPOSITE[placement], target, size);
            if (fits(flipped, size)) {
                placement = OPPOSITE[placement];
                spot = flipped;
            }
        }
        const x = clamp(spot.x, EDGE, window.innerWidth - size.width - EDGE);
        const y = clamp(spot.y, EDGE, window.innerHeight - size.height - EDGE);

        // A modal <dialog> keeps a transform from its entry animation, which makes it the
        // containing block for position: fixed; measure from its corner instead of the viewport.
        const origin = tip.container === document.body ? {left: 0, top: 0} : tip.container.getBoundingClientRect();
        bubble.style.left = `${x - origin.left}px`;
        bubble.style.top = `${y - origin.top}px`;
        bubble.dataset.placement = placement;
        // Arrow keeps pointing at the target's centre even when the bubble was clamped sideways.
        bubble.style.setProperty('--arrow-x', `${target.left + target.width / 2 - x}px`);
        bubble.style.setProperty('--arrow-y', `${target.top + target.height / 2 - y}px`);
        bubble.dataset.ready = 'true';
    }, [tip]);

    if (!tip) return null;

    return createPortal(
        <div ref={bubbleRef} className='tooltip-bubble' role='tooltip'>
            {tip.text}
        </div>,
        tip.container
    );
};
