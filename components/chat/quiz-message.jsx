import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faEyeSlash, faGamepad, faXmark} from '@fortawesome/free-solid-svg-icons';
import getQuestionWithOptions from '../../api/question/get-with-options';
import {checkMiniGameAnswer} from '../../api/question/mini-game';
import {keyOf, QuestionOptions} from '../quiz/question-options';

/**
 * A question someone sent into the chat, as the same card the home mini game uses, answered
 * right here. The question and its options come with the message, so nothing is loaded to show
 * it; only the verdict is asked of the server (the endpoint the mini game checks against), and
 * it goes back to the thread as its own message (onAnswer). The result is kept nowhere else.
 *
 * `answered` is the verdict already in the thread — a result message from this user for this
 * question — which locks the card after a reload, and `mine` locks the sender out of their own.
 */
export const QuizMessage = ({question, mine, answered, onAnswer}) => {
    const {t} = useTranslation();
    const [picked, setPicked] = useState(null);
    const [result, setResult] = useState(null);
    // Only for a message sent before the options travelled with it.
    const [loaded, setLoaded] = useState(null);

    const answers = question.answers?.length ? question.answers : loaded?.answers;

    useEffect(() => {
        if (question.answers?.length) return;
        getQuestionWithOptions(question.id).then(found => setLoaded(found?.id ? found : null));
    }, [question.id]);

    const pick = (option) => {
        if (picked != null) return;
        setPicked(keyOf(option));
        checkMiniGameAnswer(question.id, option).then(verdict => {
            // Refused (a deleted question, say): let them try again rather than locking the card.
            if (!verdict) {
                setPicked(null);
                return;
            }
            setResult(verdict);
            onAnswer(verdict, option);
        });
    };

    // Locked: their own question, or one they already answered in this chat.
    const locked = mine || Boolean(answered);
    const verdict = result ?? answered;

    // After a reload the thread remembers what they answered, not which option was right, so the
    // card finds their pick by its text and lights it — as the right one when they got it right.
    const prior = answered && (answers ?? []).find(option => option.content === answered.answer);
    const shownPicked = picked ?? (prior ? keyOf(prior) : null);
    const shownResult = result ?? (answered
        ? {correct: answered.correct, answerId: answered.correct && prior ? keyOf(prior) : undefined}
        : null);

    return (
        <div className='chat-quiz' aria-busy={!answers}>
            <header className='chat-quiz-header'>
                <span className='mini-quiz-icon' aria-hidden><FontAwesomeIcon icon={faGamepad}/></span>
                <span className='chat-quiz-label'>{t('quick_question', 'Quick question')}</span>
                {verdict && (
                    <span className='mini-quiz-verdict' data-correct={verdict.correct}>
                        {verdict.correct ? t('mini_quiz_right', 'Correct!') : t('mini_quiz_wrong', 'Not quite')}
                    </span>
                )}
            </header>

            <p className='chat-quiz-question'>{question.content}</p>

            {answers ? (
                <QuestionOptions answers={answers}
                                 picked={shownPicked}
                                 result={shownResult}
                                 disabled={locked}
                                 onPick={pick}/>
            ) : (
                <div className='mini-quiz-loading' aria-label={t('loading', 'Loading')}/>
            )}

            {/* The options stay on screen either way; this only says why they cannot be used. */}
            {locked && !result && (
                <p className='chat-quiz-locked'>
                    {mine
                        ? t('quiz_sent_by_you', 'Waiting for an answer.')
                        : t('quiz_already_answered', 'You already answered this one.')}
                </p>
            )}
        </div>
    );
};

// The answer someone gave, as it reads back in the thread. `covered` holds it back from a reader
// who has not answered that question yet: the answer and the verdict are not rendered at all,
// so there is nothing to uncover.
export const QuizResultMessage = ({correct, answer, covered}) => {
    const {t} = useTranslation();

    if (covered) {
        return (
            <p className='chat-quiz-result' data-covered='true'>
                <span className='chat-quiz-result-mark' aria-hidden>
                    <FontAwesomeIcon icon={faEyeSlash}/>
                </span>
                <span>{t('quiz_answer_covered', 'Answered — hidden until you answer it too')}</span>
            </p>
        );
    }

    return (
        <p className='chat-quiz-result' data-correct={correct}>
            <span className='chat-quiz-result-mark' aria-hidden>
                <FontAwesomeIcon icon={correct ? faCheck : faXmark}/>
            </span>
            <span className='chat-quiz-result-answer'>{answer}</span>
        </p>
    );
};
