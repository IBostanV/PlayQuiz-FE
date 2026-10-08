import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faCalendarDay, faCrown, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getDailyChallenge} from '../../api/social';
import {Avatar} from '../common/avatar';

const seconds = (value) => (value == null ? '—' : `${Math.round(value)}s`);

// "3h 12m": how long today's questions have left.
const timeLeft = (until) => {
    const minutes = Math.max(0, Math.round((until.getTime() - Date.now()) / 60000));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

// The daily challenge: the same questions for everyone today, and the table of the day's best.
// Compact on the home page (the top three and the reader); the whole top ten on its own page.
export const DailyChallenge = ({compact}) => {
    const {t} = useTranslation();
    const [status, setStatus] = useState(null);

    useEffect(() => {
        getDailyChallenge().then(result => setStatus(result ?? null));
    }, []);

    if (!status) return null;

    const closes = status.closesAt ? new Date(status.closesAt) : null;
    const shown = compact ? status.top.slice(0, 3) : status.top;
    // The reader below the table when they are not in the part of it shown.
    const youBelow = status.you && !shown.some(entry => entry.rank === status.you.rank);

    const row = (entry, you) => (
        <li key={entry.rank} className='daily-row' data-you={you || undefined} data-podium={entry.rank <= 3 ? entry.rank : undefined}>
            <span className='daily-rank'>{entry.rank === 1 ? <FontAwesomeIcon icon={faCrown}/> : entry.rank}</span>
            <Avatar name={entry.user?.displayName ?? '?'} photo={entry.user?.photo} frame={entry.user?.frame} className='daily-avatar'/>
            <span className='daily-name' style={{color: entry.user?.nameColor ?? undefined}}>{entry.user?.displayName}</span>
            <span className='daily-score'>{entry.rightAnswers}<small>/{entry.totalAnswers}</small></span>
            <span className='daily-time'>{seconds(entry.spentTime)}</span>
        </li>
    );

    return (
        <section className='home-card daily-challenge' data-wide={compact ? undefined : 'true'} aria-labelledby='daily-challenge-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='gold' aria-hidden><FontAwesomeIcon icon={faCalendarDay}/></span>
                <div>
                    <h2 id='daily-challenge-title' className='home-card-title'>
                        {t('daily_challenge', 'Daily challenge')}
                        {status.number && <span className='daily-number'> #{status.number}</span>}
                        {status.streak > 0 && (
                            <span className='daily-streak' data-tooltip={t('daily_streak', '{{days}} days in a row', {days: status.streak})}>
                                🔥 {status.streak}
                            </span>
                        )}
                    </h2>
                    <span className='home-card-sub'>
                        {t('daily_challenge_sub', '{{questions}} questions, the same for everyone · {{players}} played · new in {{left}}',
                            {questions: status.questions, players: status.players, left: closes ? timeLeft(closes) : '—'})}
                    </span>
                </div>
            </header>

            {status.played ? (
                <p className='daily-you'>
                    {t('daily_rank', 'You are #{{rank}} of {{players}} today', {rank: status.you.rank, players: status.players})}
                </p>
            ) : (
                <Link href='/quiz/categorized/0?daily=1' className='home-card-play daily-play'>
                    <FontAwesomeIcon icon={faPlay}/> {t('daily_play', 'Play today\'s challenge')}
                </Link>
            )}

            {shown.length > 0 ? (
                <ol className='daily-table'>
                    {shown.map(entry => row(entry, status.you?.rank === entry.rank))}
                    {youBelow && <li className='daily-gap' aria-hidden>…</li>}
                    {youBelow && row(status.you, true)}
                </ol>
            ) : (
                <p className='home-card-sub'>{t('daily_nobody', 'Nobody has played yet today. Be the first.')}</p>
            )}

            {compact && (
                <Link href='/challenges' className='did-you-know-more home-card-more'>
                    {t('daily_table_all', 'Full table')}
                    <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
                </Link>
            )}
        </section>
    );
};

DailyChallenge.propTypes = {
    compact: PropTypes.bool,
};
