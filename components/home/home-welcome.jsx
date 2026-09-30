import React from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBolt, faFire} from '@fortawesome/free-solid-svg-icons';
import {Avatar} from '../common/avatar';

// The top of the home page for a signed-in player: who they are, how far into their level, the
// run of days, and one obvious thing to do next. The user comes from the page, which re-reads it
// when experience changes, so the bar here moves with the navbar's.
export const HomeWelcome = ({user}) => {
    const {t} = useTranslation();
    if (!user) return null;

    // Older accounts predate the field; they stand in as a fresh level 1, as in the navbar.
    const {level = 1, intoLevel = 0, forNextLevel = 100} = user.playerLevel ?? {};
    const percent = forNextLevel ? Math.round((intoLevel / forNextLevel) * 100) : 0;

    return (
        <section className='home-welcome' aria-labelledby='home-welcome-title'>
            <Avatar name={user.username || '?'} photo={user.avatar} className='home-welcome-avatar'/>

            <div className='home-welcome-body'>
                <h1 id='home-welcome-title' className='home-welcome-title'>
                    {user.username
                        ? t('welcome_back_name', 'Welcome back, {{name}}', {name: user.username})
                        : t('welcome_back', 'Welcome back')}
                </h1>

                <div className='home-welcome-level'>
                    <span className='home-welcome-badge'>{t('level_short', 'Lv {{level}}', {level})}</span>
                    <span className='daily-task-bar home-welcome-bar'
                          role='progressbar'
                          aria-label={t('experience', 'Experience')}
                          aria-valuenow={intoLevel}
                          aria-valuemin={0}
                          aria-valuemax={forNextLevel}>
                        <span className='daily-task-fill' style={{width: `${percent}%`}}/>
                    </span>
                    <span className='home-welcome-xp'>
                        {t('xp_to_next', '{{left}} XP to level {{next}}',
                            {left: forNextLevel - intoLevel, next: level + 1})}
                    </span>
                </div>

                {user.loginStreak > 1 && (
                    <p className='home-welcome-streak'>
                        <FontAwesomeIcon icon={faFire}/>
                        {t('streak_days', '{{days}} days in a row', {days: user.loginStreak})}
                    </p>
                )}
            </div>

            <Link className='home-welcome-play' href='/quiz/express'>
                <FontAwesomeIcon icon={faBolt}/> {t('express_quiz', 'Express quiz')}
            </Link>
        </section>
    );
};
