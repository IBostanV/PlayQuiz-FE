import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {AnswerCard} from "../answer-card";

// Drag and drop: drag the right option into the slot, then confirm; reports its termId like
// single option. Clicking a card drops it too, for keyboards and phones (touch screens do not fire
// HTML drag events). Mount one per question (key it by question).
export const DragOption = ({currentQuestion, onConfirm}) => {
    const {t} = useTranslation();
    const [placed, setPlaced] = useState(null);
    const [over, setOver] = useState(false);
    const answers = currentQuestion?.answers ?? [];
    const placedAnswer = answers.find((answer) => answer.termId === placed);

    const drop = (event) => {
        event.preventDefault();
        setOver(false);
        setPlaced(Number(event.dataTransfer.getData('text/plain')));
    };

    return (
        <>
            <div className="answer-drop"
                 data-over={over}
                 data-filled={Boolean(placedAnswer)}
                 onDragOver={(event) => {
                     event.preventDefault();
                     setOver(true);
                 }}
                 onDragLeave={() => setOver(false)}
                 onDrop={drop}>
                {placedAnswer?.content ?? t('drop_answer_here', 'Drop the answer here')}
            </div>
            <div className="answer-grid">
                {answers.filter((answer) => answer.termId !== placed).map((answer, index) => (
                    <AnswerCard key={answer.termId ?? answer.content}
                                answer={answer}
                                index={index}
                                draggable
                                onDragStart={(event) => event.dataTransfer.setData('text/plain', String(answer.termId))}
                                onClick={() => setPlaced(answer.termId)}/>
                ))}
            </div>
            <button type="button" className="quiz-confirm" disabled={placed === null}
                    onClick={() => onConfirm(placed)}>
                {t('confirm', 'Confirm')}
            </button>
        </>
    );
};
