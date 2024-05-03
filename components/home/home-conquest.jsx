import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faChessRook} from '@fortawesome/free-solid-svg-icons';
import {getConquestState} from '../../api/conquest';
import {formatDate} from '../../utils/toDate';

const when = (value) => formatDate(value, undefined, {weekday: 'short', hour: '2-digit', minute: '2-digit'});

// Home page teaser for /conquest: the round, and the map in three numbers. The map reads signed
// out too, so guests get it as well; "yours" needs someone to be yours.
export const HomeConquest = ({userId}) => {
    const {t} = useTranslation();
    const [state, setState] = useState(null);

    useEffect(() => {
        getConquestState().then(result => setState(result ?? null));
    }, []);

    const countries = state?.countries ?? [];
    if (!countries.length) return null;

    const open = countries.filter(country => country.open).length;
    const held = countries.filter(country => country.heldBy).length;
    const mine = userId == null ? null
        : countries.filter(country => String(country.heldBy?.id) === String(userId)).length;

    return (
        <section className='home-card' data-wide='true' aria-labelledby='home-conquest-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' aria-hidden><FontAwesomeIcon icon={faChessRook}/></span>
                <div>
                    <h2 id='home-conquest-title' className='home-card-title'>{t('conquest', 'Conquest')}</h2>
                    <span className='home-card-sub' data-open={state.open}>
                        {t('conquest_round', 'Round {{round}}', {round: state.round})}
                        {' · '}
                        {state.open
                            ? t('conquest_open', 'Open until {{time}}', {time: when(state.openUntil)})
                            : t('conquest_opens_again', 'Opens again {{time}}', {time: when(state.nextOpenAt)})}
                    </span>
                </div>
            </header>

            <dl className='home-card-numbers'>
                <div>
                    <dt>{t('conquest_legend_open', 'Open this round')}</dt>
                    <dd>{open}</dd>
                </div>
                <div>
                    <dt>{t('conquest_legend_held', 'Conquered')}</dt>
                    <dd>{held}/{countries.length}</dd>
                </div>
                {mine != null && (
                    <div>
                        <dt>{t('conquest_yours', 'Yours')}</dt>
                        <dd>{mine}</dd>
                    </div>
                )}
            </dl>

            <Link href='/conquest' className='did-you-know-more home-card-more'>
                {state.open ? t('conquest_to_map_open', 'Take a country') : t('conquest_to_map', 'See the map')}
                <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
            </Link>
        </section>
    );
};
