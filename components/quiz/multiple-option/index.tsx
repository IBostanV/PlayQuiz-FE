import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {AnswerCard} from "../answer-card";

// What a pick reports; see SingleOption.
const byTermId = (answer) => answer.termId;

export const MultipleOption = ({ currentQuestion, handleMultipleAnswer, pickKey = byTermId }) => {
    const {t} = useTranslation();
    // Tagged with the question it belongs to rather than cleared in an effect: answers
    // can repeat across questions, so a stale selection would flash as highlighted on
    // the next question before the effect ran.
    const [selection, setSelection] = useState({ questionId: null, termIds: [] });

    const questionId = currentQuestion?.id;
    const selected = selection.questionId === questionId ? selection.termIds : [];

    const toggle = (termId) => setSelection((previous) => {
        const current = previous.questionId === questionId ? previous.termIds : [];

        return {
            questionId,
            termIds: current.includes(termId)
                ? current.filter((value) => value !== termId)
                : [...current, termId]
        };
    });

    return (
        <>
            <div className="answer-grid">
                {currentQuestion?.answers?.map((answer, index) => (
                    <AnswerCard key={pickKey(answer) || answer.content}
                                answer={answer}
                                index={index}
                                selected={selected.includes(pickKey(answer))}
                                onClick={() => toggle(pickKey(answer))} />
                ))}
            </div>
            <button type="button"
                    className="quiz-confirm"
                    disabled={!selected.length}
                    onClick={() => handleMultipleAnswer(selected)}>
                {t('confirm', 'Confirm')}
            </button>
        </>
    );
}
