import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faAnglesUp, faBullseye, faCheckDouble, faCrown, faFire, faListCheck, faRankingStar,
} from '@fortawesome/free-solid-svg-icons';
import {getLeaderboard} from '../../api/social';
import {Avatar} from '../common/avatar';

// The tables, each with its icon, its tab label and how its number reads. value is what the table
// ranks by; extra is what the server sends with it (see api/social getLeaderboard).
const BOARDS = [
    {
        key: 'QUIZZES', icon: faListCheck, label: ['lb_quizzes', 'Most quizzes'],
        value: (entry) => entry.value,
        unit: (entry, t) => t('lb_quizzes_unit', 'quizzes'),
    },
    {
        key: 'ACCURACY', icon: faBullseye, label: ['lb_accuracy', 'Most accurate'],
        value: (entry) => `${entry.value}%`,
        unit: (entry, t) => t('lb_accuracy_unit', 'of {{count}} answers', {count: entry.extra}),
    },
    {
        key: 'RIGHT_ANSWERS', icon: faCheckDouble, label: ['lb_right', 'Most right answers'],
        value: (entry) => entry.value,
        unit: (entry, t) => t('lb_right_unit', 'of {{count}}', {count: entry.extra}),
    },
    {
        key: 'LEVEL', icon: faAnglesUp, label: ['lb_level', 'Highest level'], timeless: true,
        value: (entry, t) => t('level_short', 'Lv {{level}}', {level: entry.value}),
        unit: (entry) => `${entry.extra} XP`,
    },
    {
        key: 'STREAK', icon: faFire, label: ['lb_streak', 'Longest streak'], timeless: true,
        value: (entry) => entry.value,
        unit: (entry, t) => t('lb_streak_unit', 'days in a row'),
    },
];

const PERIODS = [
    ['WEEK', 'this_week', 'This week'],
    ['MONTH', 'this_month', 'This month'],
    ['ALL', 'all_time', 'All time'],
];

// Home page: the site's best, one table at a time. Guests see it too; a signed-in reader outside
// the top ten finds their own place under it.
export const HomeLeaderboard = () => {
    const {t} = useTranslation();
    const [board, setBoard] = useState(BOARDS[0]);
    const [period, setPeriod] = useState('WEEK');
    const [table, setTable] = useState(null);

    useEffect(() => {
        let current = true;
        getLeaderboard(board.key, period).then(result => current && setTable(result ?? null));
        return () => {
            current = false;
        };
    }, [board, period]);

    const row = (entry, you) => (
        <li key={`${entry.rank}-${entry.user?.id}`} className='lb-row' data-you={you || undefined}
            data-podium={entry.rank <= 3 ? entry.rank : undefined}>
            <span className='daily-rank'>{entry.rank === 1 ? <FontAwesomeIcon icon={faCrown}/> : entry.rank}</span>
            <Avatar name={entry.user?.displayName ?? '?'} photo={entry.user?.photo} className='daily-avatar'/>
            <span className='daily-name'>{entry.user?.displayName}</span>
            <span className='lb-value'>{board.value(entry, t)}</span>
            <span className='lb-unit'>{board.unit(entry, t)}</span>
        </li>
    );

    const you = table?.you;
    const youBelow = you && !table.top.some(entry => entry.rank === you.rank);

    return (
        <section className='home-card home-leaderboard' data-wide='true' aria-labelledby='home-leaderboard-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='gold' aria-hidden><FontAwesomeIcon icon={faRankingStar}/></span>
                <div>
                    <h2 id='home-leaderboard-title' className='home-card-title'>{t('leaderboard', 'Leaderboard')}</h2>
                    <span className='home-card-sub'>
                        {table?.minAnswers
                            ? t('lb_accuracy_rule', 'Players with at least {{count}} answers. Custom quizzes do not count.',
                                {count: table.minAnswers})
                            : t('lb_rule', 'Custom quizzes do not count.')}
                    </span>
                </div>
            </header>

            <div className='lb-tabs' role='tablist' aria-label={t('leaderboard', 'Leaderboard')}>
                {BOARDS.map(each => (
                    <button key={each.key} type='button' role='tab' className='lb-tab'
                            aria-selected={each.key === board.key} onClick={() => setBoard(each)}>
                        <FontAwesomeIcon icon={each.icon}/> <span>{t(...each.label)}</span>
                    </button>
                ))}
            </div>

            {/* Level and streak are what a player has now: no period to pick. */}
            {!board.timeless && (
                <div className='stats-periods lb-periods' role='tablist'>
                    {PERIODS.map(([value, key, fallback]) => (
                        <button key={value} type='button' role='tab' className='stats-period'
                                aria-selected={period === value} onClick={() => setPeriod(value)}>
                            {t(key, fallback)}
                        </button>
                    ))}
                </div>
            )}

            {table === null ? (
                <div className='quiz-loading' aria-label={t('loading', 'Loading')}/>
            ) : table.top.length ? (
                <ol className='daily-table lb-table' key={`${board.key}-${period}`}>
                    {table.top.map(entry => row(entry, you?.rank === entry.rank))}
                    {youBelow && <li className='daily-gap' aria-hidden>…</li>}
                    {youBelow && row(you, true)}
                </ol>
            ) : (
                <p className='home-card-sub'>{t('lb_empty', 'Nobody on this table yet. Play a quiz and be the first.')}</p>
            )}
        </section>
    );
};
