import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faClockRotateLeft, faRotateRight} from '@fortawesome/free-solid-svg-icons';
import {getOwnHistory} from '../../api/quiz';
import {toDate} from '../../utils/toDate';

const SHOWN = 3;

// Where a run can be played again: a custom quiz by its id, a categorized one as a new quiz on its
// category, an express one as a new express quiz.
const againHref = (run) => {
    if (run.custom) return run.quizId ? `/quiz/custom/${run.quizId}` : null;
    if (run.categoryId) return `/quiz/categorized/${run.categoryId}`;
    return '/quiz/express';
};

const timeAgo = (date, language) => {
    const days = Math.round((date.getTime() - Date.now()) / 86400000);
    const format = new Intl.RelativeTimeFormat(language, {numeric: 'auto'});
    return days === 0 ? format.format(0, 'day') : format.format(days, 'day');
};

// Home page: the last few runs, each with its score and a way to play it again.
export const HomeRecent = () => {
    const {t, i18n} = useTranslation();
    const [runs, setRuns] = useState([]);

    useEffect(() => {
        getOwnHistory(0, SHOWN).then(page => setRuns(page?.content ?? []));
    }, []);

    if (!runs.length) return null;

    return (
        <section className='home-card' data-wide='true' aria-labelledby='home-recent-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' aria-hidden><FontAwesomeIcon icon={faClockRotateLeft}/></span>
                <div>
                    <h2 id='home-recent-title' className='home-card-title'>{t('home_recent', 'Pick up where you left off')}</h2>
                    <span className='home-card-sub'>{t('home_recent_sub', 'Your last quizzes')}</span>
                </div>
            </header>

            <ul className='home-card-rows'>
                {runs.map(run => {
                    const href = againHref(run);
                    const at = toDate(run.completedAt);
                    const scored = run.totalAnswers > 0;
                    const percent = scored ? Math.round(run.rightAnswers / run.totalAnswers * 100) : null;
                    return (
                        <li key={run.historyId} className='home-card-row'>
                            {/* The score as a small ring: green from 80%, amber from 50%, red below. */}
                            <span className='home-score-ring' aria-hidden
                                  data-grade={percent == null ? undefined : percent >= 80 ? 'good' : percent >= 50 ? 'fair' : 'poor'}
                                  style={{'--score': `${percent ?? 0}%`}}>
                                {scored ? `${percent}%` : '—'}
                            </span>
                            <span className='home-card-row-body'>
                                <span className='home-card-row-title'>
                                    {run.category ?? (run.custom ? t('custom_quiz', 'Custom quiz') : t('express_quiz', 'Express quiz'))}
                                </span>
                                <span className='home-card-row-meta'>
                                    {scored && t('right_of', '{{right}}/{{total}} right', {right: run.rightAnswers, total: run.totalAnswers})}
                                    {scored && at && ' · '}
                                    {at && timeAgo(at, i18n.language)}
                                </span>
                            </span>
                            {href && (
                                <Link href={href} className='home-card-play' data-quiet='true'
                                      aria-label={t('play_again', 'Play again')} data-tooltip={t('play_again', 'Play again')}>
                                    <FontAwesomeIcon icon={faRotateRight}/>
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
