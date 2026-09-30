import React from "react";
import base64Util from "../../utils/base64Util";

// `selected` is left undefined by single option, so only toggle cards announce a pressed state.
export const AnswerCard = ({ answer, index, selected = undefined, onClick, ...rest }) => (
    <button type="button"
            {...rest}
            className={`answer-card${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={onClick}>
        {answer?.glossaryAttachment &&
            <img className="answer-card-image" src={base64Util(answer.glossaryAttachment)} alt="" />}
        <span className="answer-card-label">
            <span className="answer-card-key">{String.fromCharCode(65 + index)}</span>
            {answer.content}
        </span>
    </button>
);
