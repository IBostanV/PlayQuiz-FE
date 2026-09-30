import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faBrain, faClock, faRotateRight} from '@fortawesome/free-solid-svg-icons';
import {answerIqTest, getLatestIqResult, startIqTest} from '../../api/iq';
import {EXPERIENCE_CHANGED} from '../../api/quiz/save';
import {IqItem} from '../../components/iq/item';

// The IQ test: the questions come one at a time, timed, and the test ends when the estimate is
// firm enough rather than after a fixed number of them — which is why the counter says "of 30"
// and most people stop before it.
//
// The page holds no answers and no scoring: it draws what the server sends and reports the click.
function IqTest({isLoggedIn}) {
    const {t} = useTranslation();
    const [question, setQuestion] = useState(null);
    const [result, setResult] = useState(null);
    const [picked, setPicked] = useState(null);
    const [busy, setBusy] = useState(false);
    const [left, setLeft] = useState(0);
    const [started, setStarted] = useState(false);
    // Read once at the start so the intro can say what they scored last time.
    const [previous, setPrevious] = useState(null);

    // The timer is the server's; this is the copy on screen, and running out submits an answer
    // of "none" rather than waiting for the player to notice.
    const submit = useRef(() => {});

    useEffect(() => {
        if (isLoggedIn) getLatestIqResult().then(found => setPrevious(found?.iq ? found : null));
    }, [isLoggedIn]);

    const take = (state) => {
        if (!state) return;
        setQuestion(state.question);
        setResult(state.result);
        setPicked(null);
        setLeft(state.question?.seconds ?? 0);
        if (state.finished && state.result) {
            window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
        }
    };

    const begin = () => {
        setBusy(true);
        setStarted(true);
        setResult(null);
        startIqTest().then(take).finally(() => setBusy(false));
    };

    const answer = (chosen) => {
        if (busy || !question) return;
        setPicked(chosen);
        setBusy(true);
        answerIqTest(chosen).then(take).finally(() => setBusy(false));
    };

    submit.current = answer;

    useEffect(() => {
        if (!question) return undefined;
        const tick = setInterval(() => setLeft(seconds => {
            if (seconds > 1) return seconds - 1;
            clearInterval(tick);
            // -1: the question was not answered, which the server scores as wrong.
            submit.current(-1);
            return 0;
        }), 1000);

        return () => clearInterval(tick);
    }, [question]);

    if (!isLoggedIn) {
        return (
            <section className='iq-page'>
                <p className='iq-lead'>{t('iq_sign_in', 'Sign in to take the test — the result is kept on your account.')}</p>
                <Link href='/login' className='iq-start'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    if (result) return <IqResultView result={result} onRetake={begin} busy={busy}/>;

    if (question) {
        // data-testing is what hides the friends dock: a timed question gets the screen.
        return (
            <section className='iq-page' data-testing='true' aria-busy={busy}>
                <header className='iq-bar'>
                    <span className='iq-count'>
                        {t('iq_question_of', 'Question {{number}} of {{total}}',
                            {number: question.number, total: question.total})}
                    </span>
                    <span className='iq-progress' aria-hidden>
                        <span className='iq-progress-fill'
                              style={{width: `${Math.round(question.number / question.total * 100)}%`}}/>
                    </span>
                    <span className='iq-clock' data-low={left <= 15}>
                        <FontAwesomeIcon icon={faClock}/> {left}s
                    </span>
                </header>

                <IqItem question={question} picked={picked} disabled={busy} onPick={answer}/>

                <p className='iq-note'>
                    {t('iq_no_going_back', 'Each question is timed and there is no going back. If you cannot see it, guess and move on.')}
                </p>
            </section>
        );
    }

    return (
        <section className='iq-page'>
            <header className='iq-hero'>
                <span className='iq-hero-icon' aria-hidden><FontAwesomeIcon icon={faBrain}/></span>
                <h1 className='iq-title'>{t('iq_test', 'IQ test')}</h1>
                <p className='iq-lead'>
                    {t('iq_intro', 'Figures, patterns and number series — no general knowledge, no language. The questions are picked as you go: get one right and the next is harder, get one wrong and it is easier, so the test finds your level instead of walking everyone through the same list.')}
                </p>
            </header>

            <ul className='iq-facts'>
                <li><strong>18&ndash;30</strong> {t('iq_facts_items', 'questions, ending once your score is settled')}</li>
                <li><strong>90s</strong> {t('iq_facts_time', 'per question, timed by the server')}</li>
                <li><strong>~20 {t('iq_facts_minutes_unit', 'min')}</strong> {t('iq_facts_minutes', 'in total, in one sitting')}</li>
                <li><strong>±10</strong> {t('iq_facts_error', 'points: the range your score is reported with')}</li>
            </ul>

            {previous && (
                <p className='iq-previous'>
                    {t('iq_previous', 'Last time you scored {{iq}}.', {iq: previous.iq})}{' '}
                    {t('iq_previous_note', 'A second go is always flattered by knowing the questions, so the first one is the one that counts.')}
                </p>
            )}

            <button type='button' className='iq-start' onClick={begin} disabled={busy || started}>
                {t('iq_begin', 'Begin the test')}
                <FontAwesomeIcon icon={faArrowRight}/>
            </button>

            <p className='iq-note'>
                {t('iq_disclaimer', 'This is a self-administered test, not a clinical assessment: nobody is supervising, and the scale is built from how this app\'s players score. Treat it as a good estimate, not a diagnosis.')}
            </p>
        </section>
    );
}

// The score, what it is worth, and what it is not.
const IqResultView = ({result, onRetake, busy}) => {
    const {t} = useTranslation();

    return (
        <section className='iq-page iq-result'>
            <span className='iq-result-label'>{t('iq_your_score', 'Your score')}</span>
            <strong className='iq-score'>{result.iq}</strong>
            <span className='iq-range'>
                {t('iq_range', 'Most likely between {{low}} and {{high}}', {low: result.low, high: result.high})}
            </span>

            <dl className='iq-breakdown'>
                <div>
                    <dt>{t('iq_percentile', 'Percentile')}</dt>
                    <dd>{t('iq_percentile_value', 'Above {{percentile}}% of takers', {percentile: result.percentile})}</dd>
                </div>
                <div>
                    <dt>{t('iq_answered', 'Questions')}</dt>
                    <dd>{result.items}</dd>
                </div>
                <div>
                    <dt>{t('iq_scale', 'Scale')}</dt>
                    <dd>
                        {result.normed
                            ? t('iq_scale_normed', 'Normed on this app\'s players')
                            : t('iq_scale_provisional', 'Provisional — too few tests to norm on yet')}
                    </dd>
                </div>
            </dl>

            <p className='iq-note'>
                {t('iq_result_note', 'The range is the honest part of the number. A test this length pins a score down to about five points of standard error, which is the ten-point range above — so 108 and 112 are the same result. Scores are quoted the usual way, with 100 in the middle and two thirds of people between 85 and 115.')}
            </p>
            {result.attemptNo > 0 && (
                <p className='iq-note'>
                    {t('iq_repeat_note', 'This was go number {{number}}. Repeat attempts run high — the questions are the same bank.',
                        {number: result.attemptNo + 1})}
                </p>
            )}

            <button type='button' className='iq-start' onClick={onRetake} disabled={busy}>
                <FontAwesomeIcon icon={faRotateRight}/>
                {t('iq_retake', 'Take it again')}
            </button>
        </section>
    );
};

IqTest.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default IqTest;
