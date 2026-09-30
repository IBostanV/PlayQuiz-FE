import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBullseye, faDumbbell} from '@fortawesome/free-solid-svg-icons';
import {getStatistics} from '../../api/statistics';

// Home page: the category this player gets wrong most, over the last month, and a quiz on it.
// The server only names a weakest one once there are enough answers to judge by, so until then
// there is nothing to say and the card stays away.
export const HomeWeakSpot = () => {
    const {t} = useTranslation();
    const [weakest, setWeakest] = useState(null);

    useEffect(() => {
        getStatistics('MONTH').then(stats => setWeakest(stats?.weakest?.[0] ?? null));
    }, []);

    if (!weakest?.categoryId) return null;

    return (
        <section className='home-card' aria-labelledby='home-weak-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='amber' aria-hidden><FontAwesomeIcon icon={faBullseye}/></span>
                <div>
                    <h2 id='home-weak-title' className='home-card-title'>{t('home_weak_spot', 'Your weak spot')}</h2>
                    <span className='home-card-sub'>{t('home_weak_spot_sub', 'This month, by how often you are right')}</span>
                </div>
            </header>

            <div className='home-weak'>
                <span className='home-weak-name'>{weakest.name}</span>
                <span className='home-weak-figure'>
                    <span className='home-weak-percent'>{weakest.accuracy}%</span>
                    {t('home_weak_right', 'right, of {{count}} questions', {count: weakest.totalAnswers})}
                </span>
                <span className='daily-task-bar home-weak-bar'>
                    <span className='daily-task-fill' style={{width: `${weakest.accuracy}%`}}/>
                </span>
            </div>

            <Link href={`/quiz/categorized/${weakest.categoryId}`} className='home-card-play home-weak-play'>
                <FontAwesomeIcon icon={faDumbbell}/> {t('home_weak_practice', 'Practise it')}
            </Link>
        </section>
    );
};
