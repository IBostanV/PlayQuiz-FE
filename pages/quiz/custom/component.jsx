import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {getCustomQuiz} from '../../../api/quiz';
import saveUserQuiz from '../../../api/quiz/save';
import formatTime from '../../../utils/formatTime';
import {SingleOption} from '../../../components/quiz/single-option';
import {MultipleOption} from '../../../components/quiz/multiple-option';
import {InputOption} from '../../../components/quiz/input-option';
import {OrderOption} from '../../../components/quiz/order-option';
import {ReportQuestion} from '../../../components/feedback/report-question';
import {ExtraTimeButton} from '../../../components/quiz/coin-actions';

// Seconds left at which a question's countdown turns red.
const LOW_TIME = 5;

// A player's own questions have no glossary terms: picks are answer ids.
const byAnswerId = (answer) => answer.id;

// Play a custom quiz. One request brings the quiz and all its questions (options shuffled, none
// marked right); they are asked in the order written, each on its own countdown. Running out of
// time moves on with no answer, scored as unanswered. The quiz type, picked by its creator,
// decides how every question is answered. The last one saves the run and shows its result.
function CustomQuiz({isLoggedIn}) {
    const {t} = useTranslation();
    const router = useRouter();
    const {quizId} = router.query;

    const [play, setPlay] = useState(null);
    const [unavailable, setUnavailable] = useState(false);
    const [position, setPosition] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(0);

    // Refs, not state: the countdown's interval reads them, and they never need a re-render.
    const answers = useRef([]);
    const startedAt = useRef(0);
    const shownAt = useRef(0);
    // The position whose turn has already ended, so an answer and the countdown hitting zero at the
    // same moment cannot both move on and skip a question.
    const endedTurn = useRef(-1);
    // This question's deadline; a ref so bought extra time can push it back.
    const deadline = useRef(0);

    useEffect(() => {
        if (!isLoggedIn) router.replace('/login');
    }, [isLoggedIn]);

    // router.query is empty until the route resolves; isReady flips once.
    useEffect(() => {
        if (!router.isReady || !isLoggedIn) return;
        getCustomQuiz(quizId).then(found => {
            if (!found?.questions?.length) {
                setUnavailable(true);
                return;
            }
            startedAt.current = Date.now();
            setPlay(found);
        });
    }, [router.isReady]);

    const quiz = play?.quiz;
    const questions = play?.questions ?? [];
    const total = questions.length;
    const finished = Boolean(play) && position >= total;
    const question = finished ? null : questions[position];

    const endTurn = (answer) => {
        if (!question || endedTurn.current === position) return;
        endedTurn.current = position;
        if (answer !== undefined) {
            answers.current.push({[question.id]: {answer, time: Date.now() - shownAt.current}});
        }
        setPosition(value => value + 1);
    };

    // Each question's countdown starts when it comes up; at zero the turn ends with no answer.
    useEffect(() => {
        if (!question) return undefined;
        shownAt.current = Date.now();
        setSecondsLeft(quiz.questionTime);
        deadline.current = shownAt.current + quiz.questionTime * 1000;
        const timer = setInterval(() => {
            const left = Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000));
            setSecondsLeft(left);
            if (!left) endTurn(undefined);
        }, 250);
        return () => clearInterval(timer);
    }, [play, position]);

    // All questions done: save the run once, then show its result.
    useEffect(() => {
        if (!finished) return;
        saveUserQuiz({
            quiz,
            spentTime: Math.round((Date.now() - startedAt.current) / 1000),
            answersJson: JSON.stringify(answers.current),
        }).then(result => result && router.push(`/quiz/result?historyId=${result.data.historyId}`));
    }, [finished]);

    const renderAnswering = () => {
        switch (quiz.quizType?.name) {
            case 'MULTIPLE_CHOICE':
                return <MultipleOption currentQuestion={question} handleMultipleAnswer={endTurn} pickKey={byAnswerId}/>;
            case 'INPUT':
                return <InputOption onConfirm={endTurn}/>;
            case 'IN_ORDER':
                return <OrderOption items={question.answers} onConfirm={endTurn}/>;
            // SINGLE_CHOICE and ONE_FROM_TWO: one pick among the options.
            default:
                return <SingleOption currentQuestion={question} handleAnswer={endTurn} pickKey={byAnswerId}/>;
        }
    };

    if (unavailable) {
        return (
            <div className="quiz-play">
                <p className="quiz-unavailable">
                    {t('custom_quiz_unavailable', 'This quiz is not available. Only its creator and the people invited to it can play it.')}
                </p>
            </div>
        );
    }

    const low = Boolean(question) && secondsLeft <= LOW_TIME;

    return (
        <div className="quiz-play">
            <header className="quiz-hud">
                <span className="quiz-hud-step">
                    {t('question', 'Question')} <b>{Math.min(position + 1, total)}</b> / {total}
                </span>
                <span className={`quiz-hud-timer${low ? ' is-low' : ''}`}>
                    {formatTime(secondsLeft)}
                    {quiz?.questionTime && (
                        // Drains with this question's time; same shape as the express quiz's ring.
                        <svg className="quiz-hud-timer-ring" viewBox="0 0 132 46" aria-hidden="true">
                            <polygon points="10.5,1 131,1 131,35.5 120.5,45 1,45 1,10.5"
                                     pathLength="100"
                                     strokeDasharray="100"
                                     strokeDashoffset={100 - Math.min(secondsLeft / quiz.questionTime, 1) * 100}/>
                        </svg>
                    )}
                </span>
            </header>
            <div className="quiz-progress">
                <div className="quiz-progress-bar" style={{width: `${total ? (position / total) * 100 : 0}%`}}/>
            </div>

            {question ? (
                // Keyed by question: replays the entrance animation and gives each answer
                // component fresh state.
                <section className="quiz-stage" key={question.id}>
                    <h2 className="quiz-question">{question.content}</h2>
                    {renderAnswering()}
                    <div className="quiz-coin-actions">
                        <ExtraTimeButton onAdd={(seconds) => { deadline.current += seconds * 1000; }}/>
                    </div>
                </section>
            ) : (
                <div className="quiz-loading" aria-label={t('loading', 'Loading')}/>
            )}

            {/* Outside the keyed stage, so an open report survives the timer moving on. Skipping
                ends the turn unanswered, and only if the reported question is still the one shown
                (endTurn ignores a turn that has already ended). */}
            {question && (
                <ReportQuestion question={question} custom
                                onSkip={(reportedId) => reportedId === question.id && endTurn(undefined)}/>
            )}
        </div>
    );
}

CustomQuiz.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default CustomQuiz;
