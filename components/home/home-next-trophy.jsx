import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faTrophy} from '@fortawesome/free-solid-svg-icons';
import {getTrophies} from '../../api/trophy';
import {TrophyBadge} from '../trophy/trophy-badge';

// Of the trophies still to win, the one furthest along. Secret ones are left out: the server
// sends nothing about them until they are earned, so there is nothing to aim at.
const nextTrophy = (trophies) => trophies
    .filter(trophy => !trophy.earned && !trophy.secret && trophy.target > 0)
    .reduce((best, trophy) => !best || trophy.progress / trophy.target > best.progress / best.target
        ? trophy : best, null);

// Home page: the nearest trophy, with how far there is to go. Signed in only.
export const HomeNextTrophy = () => {
    const {t} = useTranslation();
    const [trophies, setTrophies] = useState(null);

    useEffect(() => {
        getTrophies().then(list => setTrophies(Array.isArray(list) ? list : []));
    }, []);

    if (!trophies?.length) return null;

    const trophy = nextTrophy(trophies);
    const earned = trophies.filter(each => each.earned).length;

    return (
        <section className='home-card' aria-labelledby='home-trophy-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='gold' aria-hidden><FontAwesomeIcon icon={faTrophy}/></span>
                <div>
                    <h2 id='home-trophy-title' className='home-card-title'>{t('next_trophy', 'Next trophy')}</h2>
                    <span className='home-card-sub'>
                        {t('trophies_earned', '{{earned}} of {{total}} earned', {earned, total: trophies.length})}
                    </span>
                </div>
            </header>

            {trophy ? (
                <div className='home-trophy'>
                    <TrophyBadge trophy={trophy}/>
                    <span className='home-trophy-body'>
                        <span className='home-trophy-name'>{trophy.title}</span>
                        <span className='home-trophy-what'>{trophy.description}</span>
                        <span className='daily-task-bar'>
                            <span className='daily-task-fill'
                                  style={{width: `${Math.round(trophy.progress / trophy.target * 100)}%`}}/>
                        </span>
                    </span>
                    <span className='daily-task-progress'>{trophy.progress}/{trophy.target}</span>
                </div>
            ) : (
                <p className='home-card-sub'>{t('all_trophies_earned', 'Every trophy in sight is yours.')}</p>
            )}

            <Link href='/trophies' className='did-you-know-more home-card-more'>
                {t('all_trophies', 'All trophies')}
                <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
            </Link>
        </section>
    );
};
