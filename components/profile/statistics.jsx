import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowDown, faArrowUp, faBullseye, faChartSimple, faClock, faFire, faLayerGroup, faMinus,
    faPuzzlePiece, faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import {getStatistics} from '../../api/statistics';

const PERIODS = [
    ['DAY', 'period_day', 'Today'],
    ['WEEK', 'period_week', 'This week'],
    ['MONTH', 'period_month', 'This month'],
];

// A number with a word under it, which is what most of this page is. `trend` is the change on the
// period before — the thing that makes a count mean something.
const Tile = ({icon, value, label, hint, trend, invert}) => {
    const rising = trend > 0;
    const flat = !trend;

    return (
        <div className='stat-tile'>
            <span className='stat-tile-icon' aria-hidden><FontAwesomeIcon icon={icon}/></span>
            <span className='stat-tile-value'>{value}</span>
            <span className='stat-tile-label'>{label}</span>
            {hint && <span className='stat-tile-hint'>{hint}</span>}
            {trend !== null && trend !== undefined && (
                // Green for the good direction, whichever direction that is for this number.
                <span className='stat-tile-trend' data-good={flat ? undefined : rising !== Boolean(invert)}>
                    <FontAwesomeIcon icon={flat ? faMinus : rising ? faArrowUp : faArrowDown}/>
                    {Math.abs(trend)}{invert === 'points' ? '' : '%'}
                </span>
            )}
        </div>
    );
};

// A day of the period. One series, one hue: height is the count, and the day is on the tooltip
// rather than under every bar, which would be a wall of dates on a month.
const DayBar = ({day, most, locale, t}) => {
    const height = most ? Math.round(day.quizzes / most * 100) : 0;
    const when = new Date(day.day).toLocaleDateString(locale, {weekday: 'short', day: 'numeric', month: 'short'});

    return (
        <span className='stat-day'
              data-tooltip={`${when}: ${t('quizzes_count', '{{count}} quizzes', {count: day.quizzes})}`}>
            <span className='stat-day-bar' style={{height: `${Math.max(height, day.quizzes ? 6 : 2)}%`}}
                  data-empty={!day.quizzes}/>
        </span>
    );
};

// A category with how much of it went right: the bar is the accuracy, the count is what it is
// based on, so a 100% off three questions cannot pose as mastery.
const CategoryRow = ({category, t}) => (
    <li className='stat-category'>
        <span className='stat-category-name'>{category.name}</span>
        <span className='stat-category-bar'>
            <span className='stat-category-fill' style={{width: `${category.accuracy}%`}}/>
        </span>
        <span className='stat-category-value'>{category.accuracy}%</span>
        <span className='stat-category-count'>
            {t('of_questions', 'of {{count}}', {count: category.totalAnswers})}
        </span>
    </li>
);

// The profile's statistics: a day, a week or a month of playing, with the period before it for
// company. Everything here is read from the quiz history — nothing is kept in step by hand.
// Without a userId they are the signed-in player's own; with one, that player's.
export const Statistics = ({userId = null}) => {
    const {t, i18n} = useTranslation();
    const [period, setPeriod] = useState('WEEK');
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getStatistics(period, userId)
            .then(result => setStats(result?.period ? result : null))
            .finally(() => setLoading(false));
    }, [period, userId]);

    const most = stats ? Math.max(...stats.byDay.map(day => day.quizzes), 0) : 0;
    const minutes = stats?.minutesPlayed ?? 0;

    return (
        <section className='stats-panel' aria-labelledby='stats-title' aria-busy={loading}>
            <header className='stats-header'>
                <h2 id='stats-title' className='profile-section-title'>{t('statistics', 'Statistics')}</h2>
                <div className='stats-periods' role='tablist' aria-label={t('statistics', 'Statistics')}>
                    {PERIODS.map(([value, key, fallback]) => (
                        <button key={value}
                                type='button'
                                role='tab'
                                className='stats-period'
                                aria-selected={period === value}
                                onClick={() => setPeriod(value)}>
                            {t(key, fallback)}
                        </button>
                    ))}
                </div>
            </header>

            {!stats || !stats.quizzes ? (
                <p className='profile-hint'>
                    {loading ? t('loading', 'Loading') : t('stats_empty', 'No quizzes in this period yet.')}
                </p>
            ) : (
                <>
                    <div className='stat-tiles'>
                        <Tile icon={faPuzzlePiece} value={stats.quizzes}
                              label={t('quizzes', 'Quizzes')}
                              hint={t('stats_active_days', 'on {{days}} days', {days: stats.activeDays})}
                              trend={stats.trend?.quizzesChange}/>
                        <Tile icon={faBullseye} value={`${stats.accuracy}%`}
                              label={t('accuracy', 'Accuracy')}
                              hint={t('stats_right_wrong', '{{right}} right · {{wrong}} wrong',
                                  {right: stats.rightAnswers, wrong: stats.wrongAnswers})}
                              trend={stats.trend?.accuracyChange} invert='points'/>
                        <Tile icon={faClock} value={`${stats.secondsPerQuestion}s`}
                              label={t('stats_per_question', 'Per question')}
                              hint={t('stats_per_quiz', '{{seconds}}s per quiz', {seconds: stats.secondsPerQuiz})}/>
                        <Tile icon={faChartSimple} value={minutes >= 60
                            ? t('stats_hours', '{{hours}}h', {hours: (minutes / 60).toFixed(1)})
                            : t('stats_minutes', '{{minutes}}m', {minutes})}
                              label={t('stats_time_played', 'Time played')}/>
                        <Tile icon={faTrophy} value={stats.trophies} label={t('trophies', 'Trophies')}
                              hint={t('stats_trophies_hint', 'won in this period')}/>
                        <Tile icon={faFire} value={stats.loginStreak}
                              label={t('stats_streak', 'Day streak')}
                              hint={t('stats_streak_hint', 'days in a row right now')}/>
                    </div>

                    <div className='stat-activity'>
                        <span className='stat-section-title'>{t('stats_activity', 'Quizzes per day')}</span>
                        <div className='stat-days'>
                            {stats.byDay.map(day => (
                                <DayBar key={day.day} day={day} most={most} locale={i18n.language} t={t}/>
                            ))}
                        </div>
                        <span className='stat-days-ends'>
                            <span>{new Date(stats.from).toLocaleDateString(i18n.language, {day: 'numeric', month: 'short'})}</span>
                            <span>{new Date(stats.to).toLocaleDateString(i18n.language, {day: 'numeric', month: 'short'})}</span>
                        </span>
                    </div>

                    <div className='stat-columns'>
                        {stats.topCategory && (
                            <div className='stat-block'>
                                <span className='stat-section-title'>
                                    <FontAwesomeIcon icon={faLayerGroup}/> {t('stats_most_played', 'Played most')}
                                </span>
                                <p className='stat-top-category'>{stats.topCategory.name}</p>
                                <p className='profile-hint'>
                                    {t('stats_top_category_hint', '{{quizzes}} quizzes · {{accuracy}}% right',
                                        {quizzes: stats.topCategory.quizzes, accuracy: stats.topCategory.accuracy})}
                                </p>
                            </div>
                        )}

                        {/* Named only where enough questions were answered to mean anything; the
                            server keeps that rule, so an empty list here is an honest one. */}
                        {stats.strongest.length > 0 && (
                            <div className='stat-block'>
                                <span className='stat-section-title'>{t('stats_strong', 'Strong points')}</span>
                                <ul className='stat-categories'>
                                    {stats.strongest.map(category => (
                                        <CategoryRow key={category.categoryId} category={category} t={t}/>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {stats.weakest.length > 0 && (
                            <div className='stat-block'>
                                <span className='stat-section-title'>{t('stats_weak', 'Worth some reading')}</span>
                                <ul className='stat-categories' data-weak='true'>
                                    {stats.weakest.map(category => (
                                        <CategoryRow key={category.categoryId} category={category} t={t}/>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
};
