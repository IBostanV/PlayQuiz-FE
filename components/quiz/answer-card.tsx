import React from "react";
import {useTranslation} from "react-i18next";
import base64Util from "../../utils/base64Util";
import {translated} from "../../utils/translated";

export const answerText = (answer, langCode) => translated(answer?.answerTranslations, langCode, answer?.content);

// `selected` is left undefined by single option, so only toggle cards announce a pressed state.
export const AnswerCard = ({ answer, index, selected = undefined, onClick, ...rest }) => {
    const {i18n} = useTranslation();
    return (
        <button type="button"
                {...rest}
                className={`answer-card${selected ? ' is-selected' : ''}`}
                aria-pressed={selected}
                onClick={onClick}>
            {answer?.glossaryAttachment &&
                <img className="answer-card-image" src={base64Util(answer.glossaryAttachment)} alt="" />}
            <span className="answer-card-label">
                <span className="answer-card-key">{String.fromCharCode(65 + index)}</span>
                {answerText(answer, i18n.language)}
            </span>
        </button>
    );
};
