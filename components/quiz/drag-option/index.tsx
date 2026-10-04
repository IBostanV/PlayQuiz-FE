import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {AnswerCard} from "../answer-card";

// Matching pairs: drag each value onto the thing it belongs to, then confirm; reports
// {termId: value} for every key. The server sends each key (glossaryKey) with someone else's value
// (content), so a value is known by its index. Clicking a value drops it in the first empty slot
// and clicking a filled slot gives it back, for keyboards and phones (touch screens do not fire
// HTML drag events). Mount one per question (key it by question).
export const DragOption = ({currentQuestion, onConfirm}) => {
    const {t} = useTranslation();
    const answers = currentQuestion?.answers ?? [];
    // termId -> index of the value placed on it
    const [placed, setPlaced] = useState<Record<string, number>>({});
    const [over, setOver] = useState(null);
    const used = Object.values(placed);

    const put = (termId, index) => setPlaced((current) => {
        const next = Object.fromEntries(Object.entries(current).filter(([, value]) => value !== index));
        return {...next, [termId]: index};
    });
    const takeBack = (termId) => setPlaced((current) => Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== String(termId))));
    const firstEmpty = answers.find((answer) => placed[answer.termId] === undefined);

    return (
        <>
            {answers.map((answer) => (
                <div key={answer.termId} className="answer-pair">
                    <span className="answer-pair-key">{answer.glossaryKey}</span>
                    <div className="answer-drop"
                         role="button"
                         tabIndex={0}
                         data-over={over === answer.termId}
                         data-filled={placed[answer.termId] !== undefined}
                         onClick={() => takeBack(answer.termId)}
                         onKeyDown={(event) => event.key === 'Enter' && takeBack(answer.termId)}
                         onDragOver={(event) => {
                             event.preventDefault();
                             setOver(answer.termId);
                         }}
                         onDragLeave={() => setOver(null)}
                         onDrop={(event) => {
                             event.preventDefault();
                             setOver(null);
                             put(answer.termId, Number(event.dataTransfer.getData('text/plain')));
                         }}>
                        {placed[answer.termId] !== undefined
                            ? answers[placed[answer.termId]].content
                            : t('drop_answer_here', 'Drop the answer here')}
                    </div>
                </div>
            ))}
            <div className="answer-grid">
                {answers.map((answer, index) => !used.includes(index) && (
                    <AnswerCard key={index}
                                answer={{content: answer.content}}
                                index={index}
                                draggable
                                onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
                                onClick={() => firstEmpty && put(firstEmpty.termId, index)}/>
                ))}
            </div>
            <button type="button" className="quiz-confirm" disabled={used.length < answers.length}
                    onClick={() => onConfirm(Object.fromEntries(
                        Object.entries(placed).map(([termId, index]) => [termId, answers[index].content])))}>
                {t('confirm', 'Confirm')}
            </button>
        </>
    );
};
