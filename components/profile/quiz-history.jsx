import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faChevronDown, faWandMagicSparkles} from '@fortawesome/free-solid-svg-icons';
import {getOwnHistory, getOwnStatistics, getUserHistoryQuiz} from '../../api/quiz';
import {Pagination} from '../admin/pagination';
import {AnswerList} from '../quiz/answer-list';
import {formatDate} from '../../utils/toDate';

const PAGE_SIZE = 10;

const played = (value) => formatDate(value, undefined, {dateStyle: 'medium', timeStyle: 'short'});

// Runs recorded before the score was kept have none, so they show a dash. The statistics leave
// them out too — that is done in the database, over the whole history rather than this page.
const scoreOf = (run) => run.totalAnswers > 0
  ? Math.round((run.rightAnswers / run.totalAnswers) * 100)
  : null;

const Stat = ({label, value, unit}) => (
    <div className={'profile-stat'}>
        <dt>{label}</dt>
        <dd>{value}{unit && <span className={'profile-stat-unit'}>{unit}</span>}</dd>
    </div>
);

// Every quiz the player has finished, newest first, a page at a time, with the answers of any run
// they open. The list carries only each run's score; the answers are read one run at a time.
export const QuizHistory = () => {
    const {t} = useTranslation();

    // 1-based, the way the pager counts; the endpoint takes it 0-based.
    const [page, setPage] = useState(1);
    const [runs, setRuns] = useState({content: [], totalElements: 0, totalPages: 0});
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    // The run whose answers are open, and the answers once they have been read.
    const [openRun, setOpenRun] = useState(null);
    const [answers, setAnswers] = useState({});

    useEffect(() => {
        setLoading(true);
        // Turning the page closes whatever was open: its row is no longer on screen.
        setOpenRun(null);
        getOwnHistory(page - 1, PAGE_SIZE)
            .then(result => setRuns(result ?? {content: [], totalElements: 0, totalPages: 0}))
            .finally(() => setLoading(false));
    }, [page]);

    // Once: the totals cover every run, so they do not change as the pages do.
    useEffect(() => {
        getOwnStatistics().then(result => setStats(result ?? null));
    }, []);

    const toggle = (run) => {
        if (openRun === run.historyId) {
            setOpenRun(null);
            return;
        }
        setOpenRun(run.historyId);
        // Read once, then kept: reopening a run does not ask again.
        if (!answers[run.historyId]) {
            getUserHistoryQuiz(run.historyId).then(history =>
                setAnswers(current => ({...current, [run.historyId]: history?.answers ?? []})));
        }
    };

    const empty = !loading && !runs.content.length && page === 1;

    return (
        <section className={'profile-history'}>
            <h2 className={'profile-section-title'}>{t('quiz_history', 'Quiz history')}</h2>

            {stats && stats.played > 0 && (
                <dl className={'profile-stats'}>
                    <Stat label={t('quizzes_played', 'Quizzes played')} value={stats.played}/>
                    <Stat label={t('questions_answered', 'Questions')} value={stats.answered}/>
                    <Stat label={t('right_answers', 'Right')} value={stats.rightAnswers}/>
                    <Stat label={t('accuracy', 'Accuracy')} value={stats.accuracy} unit={'%'}/>
                    <Stat label={t('best_score', 'Best score')} value={stats.best} unit={'%'}/>
                    <Stat label={t('time_spent', 'Time')} value={Math.round(stats.seconds / 60)} unit={'m'}/>
                </dl>
            )}

            {empty && (
                <p className={'profile-hint'}>
                    {t('no_quiz_history', 'No finished quizzes yet. Take one and it will show up here.')}
                </p>
            )}

            {loading ? <div className={'result-loading'} aria-label={t('loading', 'Loading')}/> : (
                <ul className={'profile-runs'}>
                    {runs.content.map(run => {
                        const open = openRun === run.historyId;
                        const score = scoreOf(run);

                        return (
                            <li key={run.historyId} className={'profile-run'} data-open={open}>
                                <button type={'button'} className={'profile-run-head'}
                                        onClick={() => toggle(run)}
                                        aria-expanded={open}>
                                    <span className={'profile-run-title'}>
                                        {run.category ?? t('express_quiz', 'Express quiz')}
                                        {run.custom && (
                                            <span className={'profile-run-custom'}
                                                  title={t('custom_quiz', 'Custom quiz')}>
                                                <FontAwesomeIcon icon={faWandMagicSparkles}/>
                                            </span>
                                        )}
                                        {run.quizType && <span className={'profile-run-type'}>{run.quizType}</span>}
                                    </span>

                                    <span className={'profile-run-date'}>{played(run.completedAt)}</span>

                                    <span className={'profile-run-score'}
                                          data-band={score == null ? 'none' : score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low'}>
                                        {score == null
                                            ? '—'
                                            : <>{run.rightAnswers}/{run.totalAnswers}<span
                                                className={'profile-run-percent'}>{score}%</span></>}
                                    </span>

                                    <FontAwesomeIcon icon={faChevronDown} className={'profile-run-chevron'}/>
                                </button>

                                {open && (
                                    answers[run.historyId]
                                        ? <AnswerList answers={answers[run.historyId]} sendable={false}/>
                                        : <div className={'result-loading'} aria-label={t('loading', 'Loading')}/>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <Pagination page={page}
                        pageCount={runs.totalPages}
                        total={runs.totalElements}
                        pageSize={PAGE_SIZE}
                        onChange={setPage}
                        label={t('quiz_history', 'Quiz history')}/>
        </section>
    );
};
