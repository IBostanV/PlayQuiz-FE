import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {questionText} from '../../utils/translated';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFire, faForward, faGamepad} from '@fortawesome/free-solid-svg-icons';
import {checkMiniGameAnswer, getMiniGameQuestion} from '../../api/question/mini-game';
import {keyOf, QuestionOptions} from '../quiz/question-options';
import {SendQuestion} from '../chat/send-question';

// Home page mini game: one random question at a time, answered right here. Right or wrong
// shows at once, with the right option lit, and a streak counts correct answers in a row.
// Renders nothing when there is no question to ask.
export const MiniQuiz = () => {
    const {t, i18n} = useTranslation();
    const [question, setQuestion] = useState(null);
    const [picked, setPicked] = useState(null);
    const [result, setResult] = useState(null);
    const [streak, setStreak] = useState(0);
    const [loading, setLoading] = useState(true);

    const next = () => {
        setLoading(true);
        getMiniGameQuestion()
            .then(found => {
                setQuestion(found?.id ? found : null);
                setPicked(null);
                setResult(null);
            })
            .finally(() => setLoading(false));
    };

    useEffect(next, []);

    const pick = (option) => {
        if (picked != null) return;
        setPicked(keyOf(option));
        checkMiniGameAnswer(question.id, option).then(verdict => {
            if (!verdict) {
                setPicked(null);
                return;
            }
            setResult(verdict);
            setStreak(value => (verdict.correct ? value + 1 : 0));
        });
    };

    if (!question && !loading) return null;

    return (
        <section className='mini-quiz' aria-labelledby='mini-quiz-title' aria-busy={loading}>
            <header className='mini-quiz-header'>
                <span className='mini-quiz-icon' aria-hidden><FontAwesomeIcon icon={faGamepad}/></span>
                <div>
                    <h2 id='mini-quiz-title' className='mini-quiz-title'>{t('quick_question', 'Quick question')}</h2>
                    {/* The category, replaced by the verdict once answered. */}
                    <span aria-live='polite'>
                        {result ? (
                            <span className='mini-quiz-verdict' data-correct={result.correct}>
                                {result.correct ? t('mini_quiz_right', 'Correct!') : t('mini_quiz_wrong', 'Not quite')}
                            </span>
                        ) : question?.categoryName && <span className='mini-quiz-category'>{question.categoryName}</span>}
                    </span>
                </div>
                <span className='mini-quiz-streak' data-hot={streak >= 3}
                      data-tooltip={t('mini_quiz_streak', 'Correct answers in a row')}>
                    <FontAwesomeIcon icon={faFire}/> {streak}
                </span>
                {question && (
                    <button type='button' className='mini-quiz-next' onClick={next} disabled={loading}
                            data-ready={Boolean(result)}>
                        {result ? t('next', 'Next') : t('skip', 'Skip')}
                        <span className='mini-quiz-next-icon' aria-hidden><FontAwesomeIcon icon={faForward}/></span>
                    </button>
                )}
            </header>

            {question ? (
                <div className='mini-quiz-play' key={question.id}>
                    <p className='mini-quiz-question'>{questionText(question, i18n.language)}</p>

                    <QuestionOptions answers={question.answers ?? []}
                                     picked={picked}
                                     result={result}
                                     onPick={pick}/>

                    <SendQuestion question={question}/>
                </div>
            ) : (
                <div className='mini-quiz-loading' aria-label={t('loading', 'Loading')}/>
            )}
        </section>
    );
};
