import React from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faStopwatch, faXmark} from '@fortawesome/free-solid-svg-icons';
import {SendQuestion} from '../chat/send-question';

// A right answer comes back with no right answer to show: there was nothing to correct.
export const isRight = (answer) => !answer.rightAnswer;

// Seconds, one decimal; a question that ran out of time has none.
const seconds = (millis) => millis ? `${(millis / 1000).toFixed(1)}s` : '—';

// Every question of a finished run with what was answered and, where it was wrong, what it
// should have been. Shared by the result page and the history on the profile, so a run reads the
// same wherever it is opened.
export const AnswerList = ({answers = [], sendable = true}) => {
    const {t} = useTranslation();

    return (
        <ol className={'result-answers'}>
            {answers.map((answer, index) => (
                <li key={index} className={'result-answer'} data-right={isRight(answer)}>
                    <span className={'result-answer-mark'} aria-hidden>
                        <FontAwesomeIcon icon={isRight(answer) ? faCheck : faXmark}/>
                    </span>

                    <div className={'result-answer-body'}>
                        <p className={'result-answer-question'}>
                            <span className={'result-answer-index'}>{index + 1}</span>
                            {answer.content}
                        </p>

                        <p className={'result-answer-line'} data-kind={isRight(answer) ? 'right' : 'wrong'}>
                            <span className={'result-answer-label'}>{t('your_answer', 'Your answer')}</span>
                            {answer.userAnswer ?? t('no_answer', 'Not answered')}
                        </p>

                        {/* Only when it was wrong: a right answer carries nothing to correct. */}
                        {!isRight(answer) && (
                            <p className={'result-answer-line'} data-kind={'expected'}>
                                <span className={'result-answer-label'}>{t('right_answer', 'Right answer')}</span>
                                {answer.rightAnswer}
                            </p>
                        )}

                        {/* Only when the history carries the question's id: without one there is
                            nothing for the chat card to load. */}
                        {sendable && (
                            <SendQuestion question={{id: answer.questionId ?? answer.id,
                                                     content: answer.content}}/>
                        )}
                    </div>

                    <span className={'result-answer-time'} title={t('time_spent', 'Time')}>
                        <FontAwesomeIcon icon={faStopwatch}/> {seconds(answer.time)}
                    </span>
                </li>
            ))}
        </ol>
    );
};
