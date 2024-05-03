import React, {useState} from "react";
import {useTranslation} from "react-i18next";

// Type the answer. Mount one per question (key it by question) so each starts empty. Enter
// confirms, like the button.
export const InputOption = ({ onConfirm }) => {
    const {t} = useTranslation();
    const [value, setValue] = useState('');

    const submit = (event) => {
        event.preventDefault();
        if (value.trim()) onConfirm(value.trim());
    };

    return (
        <form className="answer-input" onSubmit={submit}>
            <input type="text"
                   value={value}
                   maxLength={1000}
                   autoFocus
                   placeholder={t('type_your_answer', 'Type your answer')}
                   aria-label={t('your_answer', 'Your answer')}
                   onChange={(event) => setValue(event.target.value)} />
            <button type="submit" className="quiz-confirm" disabled={!value.trim()}>
                {t('confirm', 'Confirm')}
            </button>
        </form>
    );
};
