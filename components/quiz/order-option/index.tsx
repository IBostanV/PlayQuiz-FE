import React, {useState} from "react";
import {useTranslation} from "react-i18next";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faArrowDown, faArrowUp} from "@fortawesome/free-solid-svg-icons";

// Put the items in order: each row moves up or down one place, and Confirm reports the answer
// ids in the order shown. Buttons rather than dragging, so it works by keyboard and on phones.
// The server sends the items shuffled; mount one per question (key it by question). `pickKey` is
// what each item reports: its answer id by default, its termId for glossary questions.
const byId = (item) => item.id;

export const OrderOption = ({ items, onConfirm, pickKey = byId }) => {
    const {t} = useTranslation();
    const [order, setOrder] = useState(items ?? []);

    const move = (from, to) => setOrder((list) => {
        const next = [...list];
        [next[from], next[to]] = [next[to], next[from]];
        return next;
    });

    return (
        <>
            <ol className="answer-order">
                {order.map((item, index) => (
                    <li key={pickKey(item)} className="answer-order-item">
                        <span className="answer-card-key">{index + 1}</span>
                        <span className="answer-order-text">{item.content}</span>
                        <button type="button"
                                className="answer-order-move"
                                disabled={index === 0}
                                onClick={() => move(index, index - 1)}
                                aria-label={t('move_up', 'Move {{item}} up', {item: item.content})}>
                            <FontAwesomeIcon icon={faArrowUp} />
                        </button>
                        <button type="button"
                                className="answer-order-move"
                                disabled={index === order.length - 1}
                                onClick={() => move(index, index + 1)}
                                aria-label={t('move_down', 'Move {{item}} down', {item: item.content})}>
                            <FontAwesomeIcon icon={faArrowDown} />
                        </button>
                    </li>
                ))}
            </ol>
            <button type="button" className="quiz-confirm" onClick={() => onConfirm(order.map(pickKey))}>
                {t('confirm', 'Confirm')}
            </button>
        </>
    );
};
