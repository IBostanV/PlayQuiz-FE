import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCoins, faTicket} from '@fortawesome/free-solid-svg-icons';
import {buyCosmetic, getCosmetics, takeOffCosmetic, wearCosmetic} from '../../api/cosmetics';
import {Avatar} from '../common/avatar';

// Names for the codes; the server sends only codes, as it does for daily tasks.
const NAMES = {
    FRAME_SKY: ['cosmetic_frame_sky', 'Sky ring'],
    FRAME_BRONZE: ['cosmetic_frame_bronze', 'Bronze'],
    FRAME_SILVER: ['cosmetic_frame_silver', 'Silver'],
    FRAME_NEON: ['cosmetic_frame_neon', 'Neon'],
    FRAME_GOLD: ['cosmetic_frame_gold', 'Gold'],
    FRAME_RAINBOW: ['cosmetic_frame_rainbow', 'Rainbow'],
    FRAME_CHAMPION: ['cosmetic_frame_champion', 'Season champion'],
    COLOR_SKY: ['cosmetic_color_sky', 'Sky'],
    COLOR_MINT: ['cosmetic_color_mint', 'Mint'],
    COLOR_CORAL: ['cosmetic_color_coral', 'Coral'],
    COLOR_VIOLET: ['cosmetic_color_violet', 'Violet'],
    COLOR_GOLD: ['cosmetic_color_gold', 'Gold'],
    COLOR_SEASON: ['cosmetic_color_season', 'Season bloom'],
};

export const cosmeticName = (code, t) => (NAMES[code] ? t(...NAMES[code]) : code);

// The shop's wardrobe: every frame and name colour, previewed on the reader's own face and name,
// to buy, wear or take off. Season-pass items show where they are won until they are owned.
export const Wardrobe = ({name, photo}) => {
    const {t} = useTranslation();
    const [catalog, setCatalog] = useState(null);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        getCosmetics().then(result => setCatalog(result?.items ? result : null));
    }, []);

    if (!catalog) return null;

    const act = (code, request) => {
        setBusy(code);
        request.then(next => next?.items && setCatalog(next)).finally(() => setBusy(null));
    };

    const section = (type, title) => (
        <section className='wardrobe-section' aria-label={title}>
            <h2 className='profile-section-title'>{title}</h2>
            <ul className='wardrobe-grid'>
                {catalog.items.filter(item => item.type === type).map(item => (
                    <li key={item.code} className='wardrobe-item' data-worn={item.worn || undefined}>
                        <span className='wardrobe-preview'>
                            {type === 'FRAME'
                                ? <Avatar name={name} photo={photo} frame={item.code} className='wardrobe-avatar'/>
                                : <span className='wardrobe-name' style={{color: item.color}}>{name}</span>}
                        </span>
                        <b className='wardrobe-title'>{cosmeticName(item.code, t)}</b>
                        {item.worn ? (
                            <button type='button' className='profile-secondary-button' disabled={busy === item.code}
                                    onClick={() => act(item.code, takeOffCosmetic(type))}>
                                {t('cosmetic_take_off', 'Take off')}
                            </button>
                        ) : item.owned ? (
                            <button type='button' className='profile-secondary-button' disabled={busy === item.code}
                                    onClick={() => act(item.code, wearCosmetic(item.code))}>
                                {t('cosmetic_wear', 'Wear')}
                            </button>
                        ) : item.seasonal ? (
                            <Link href='/season' className='wardrobe-season'>
                                <FontAwesomeIcon icon={faTicket}/> {t('cosmetic_season_only', 'Season pass reward')}
                            </Link>
                        ) : (
                            <button type='button' className='profile-secondary-button'
                                    disabled={busy === item.code || catalog.coins < item.price}
                                    onClick={() => act(item.code, buyCosmetic(item.code))}>
                                <FontAwesomeIcon icon={faCoins}/> {item.price}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );

    return (
        <>
            {section('FRAME', t('cosmetic_frames', 'Avatar frames'))}
            {section('NAME_COLOR', t('cosmetic_name_colors', 'Name colours'))}
        </>
    );
};

Wardrobe.propTypes = {
    name: PropTypes.string,
    photo: PropTypes.any,
};
