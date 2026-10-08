import React, {useEffect} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';

// What a face number looks like: a card picture in public/resources/pairs, each a whole card face
// with its own frame. The server deals from as many faces as this list holds (LiveService.FACES):
// keep the two the same length.
const FACES = [
    '01_celestial.webp', '01_galaxy.webp', '01_moon.webp',
    '02_ancient_forest.webp', '02_clover.webp', '02_forest.webp',
    '03_fire.webp', '03_ice_crystal.webp', '03_phoenix.webp',
    '04_ocean.webp', '04_ocean_whale.webp', '04_sun.webp',
    '05_desert_city.webp', '05_raven.webp', '05_sun.webp',
    '06_autumn_tree.webp', '06_ice_castle.webp', '06_moon.webp',
    '07_arcane.webp', '07_arcane_crystal.webp', '07_lightning.webp',
    '08_celestial_sun.webp', '08_lotus.webp', '08_mountain.webp',
    '09_cherry_blossom_temple.webp', '09_desert.webp', '09_lightning.webp',
    '10_cherry_blossom.webp', '10_forest_portal.webp', '10_lightning_mountain.webp',
];
const faceUrl = (face) => `/resources/pairs/${FACES[face]}`;
// What a screen reader says for a face: its file name without the number, e.g. "ice crystal".
const faceName = (face) => FACES[face].replace(/^\d+_|\.webp$/g, '').replace(/_/g, ' ');

// The pairs table of a live game. The server sends a face only for a card that is turned or
// taken, so a face-down card here really is unknown. Turning one is up to the player whose turn
// it is, and the server checks that too.
export const PairsBoard = ({room, onFlip, busy}) => {
    const {t} = useTranslation();
    const {cards, takenBy, turned, turn} = room.pairs;
    const myTurn = room.phase === 'TURN' && turn === room.you;
    // Wider rows for bigger tables, so the board stays roughly as wide as it is tall; a phone gets
    // fewer columns (the CSS reads --pairs-columns-phone there).
    const count = cards.length;
    const columns = count <= 16 ? 4 : count <= 36 ? 6 : count <= 48 ? 8 : 10;
    const phoneColumns = count <= 24 ? 4 : 6;

    // Every picture fetched once, up front, so a card shows its face the moment it is turned
    // rather than when its picture arrives. The browser keeps them for the next game.
    useEffect(() => {
        FACES.forEach((file, face) => {
            new Image().src = faceUrl(face);
        });
    }, []);

    return (
        <div className='pairs-board' style={{'--pairs-columns': columns, '--pairs-columns-phone': phoneColumns}} data-my-turn={myTurn || undefined}>
            {cards.map((face, index) => {
                const owner = takenBy[index];
                const up = turned.includes(index);
                const state = owner != null ? (owner === room.you ? 'mine' : 'taken')
                    : up ? (room.phase === 'MISMATCH' ? 'miss' : 'up') : 'down';
                const canFlip = myTurn && !busy && state === 'down' && turned.length < 2;
                return (
                    <button key={index} type='button' className='pairs-card' data-state={state}
                            disabled={!canFlip} onClick={() => onFlip(index)}
                            aria-label={face == null
                                ? t('pairs_card_down', 'Card {{number}}, face down', {number: index + 1})
                                : t('pairs_card_up', 'Card {{number}}: {{face}}', {number: index + 1, face: faceName(face)})}>
                        {face != null && <img className='pairs-face' src={faceUrl(face)} alt='' draggable={false}/>}
                    </button>
                );
            })}
        </div>
    );
};

PairsBoard.propTypes = {
    room: PropTypes.object.isRequired,
    onFlip: PropTypes.func.isRequired,
    busy: PropTypes.bool,
};
