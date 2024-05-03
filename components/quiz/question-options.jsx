import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faXmark} from '@fortawesome/free-solid-svg-icons';

// Glossary options are told apart by termId, the others by answer id.
export const keyOf = (option) => option.termId ?? option.id;
const letter = (index) => String.fromCharCode(65 + index);

// The options of one question and how they read once answered: the right one lit, a wrong pick
// crossed out, the rest faded. Shared by the home mini game and the card a chat question shows,
// so both check and display an answer the same way.
export const QuestionOptions = ({answers = [], picked, result, onPick, disabled = false}) => {
    const rightKey = result && (result.termId ?? result.answerId);
    const stateOf = (option) => {
        const key = keyOf(option);
        if (!result) return key === picked ? 'checking' : undefined;
        if (key === rightKey) return 'right';
        return key === picked ? 'wrong' : 'faded';
    };

    return (
        <div className='mini-quiz-options'>
            {answers.map((option, index) => (
                <button key={keyOf(option) ?? index} type='button' className='mini-quiz-option'
                        data-state={stateOf(option)} disabled={disabled || picked != null}
                        onClick={() => onPick(option)}>
                    <span className='mini-quiz-letter' aria-hidden>
                        {stateOf(option) === 'right' ? <FontAwesomeIcon icon={faCheck}/>
                            : stateOf(option) === 'wrong' ? <FontAwesomeIcon icon={faXmark}/>
                                : letter(index)}
                    </span>
                    <span>{option.content}</span>
                </button>
            ))}
        </div>
    );
};
