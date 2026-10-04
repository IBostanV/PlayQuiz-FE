import React from "react";
import {AnswerCard} from "../answer-card";

// Same shape the server reads as a number (Numbers.parse): thousands grouped by spaces or commas.
const toNumber = (text) => /^-?[0-9][0-9 ,]*(\.[0-9]+)?$/.test(text?.trim() ?? '')
    ? Number(text.trim().replace(/[ ,]/g, ''))
    : null;

// Halfway between two values, rounded to a step no bigger than half the gap, so it stays strictly
// between them (1912 and 1914 cut at 1913, not 1910).
const cutBetween = (low, high) => {
    const step = 10 ** Math.floor(Math.log10((high - low) / 2));
    return Number((Math.round((low + high) / 2 / step) * step).toPrecision(12));
};

// The options' values cut into ranges, one value in each: below the first cut, between cuts,
// and from the last cut up. `from` is inclusive and `to` exclusive, as the server marks them;
// an open end is null.
export const toRanges = (answers = []) => {
    const values = Array.from(new Set(answers.map((answer) => toNumber(answer.content)).filter((value) => value !== null)))
        .sort((a, b) => a - b);
    const cuts = values.slice(1).map((value, index) => cutBetween(values[index], value));
    return [null, ...cuts].map((from, index) => ({from, to: cuts[index] ?? null}));
};

const label = ({from, to}) => from === null ? `< ${to.toLocaleString()}`
    : to === null ? `≥ ${from.toLocaleString()}`
        : `${from.toLocaleString()} – ${to.toLocaleString()}`;

// Values range: pick the range the answer falls in. Reports {from, to}.
export const RangeOption = ({answers, onConfirm}) => (
    <div className="answer-grid">
        {toRanges(answers).map((range, index) => (
            <AnswerCard key={label(range)}
                        answer={{content: label(range)}}
                        index={index}
                        onClick={() => onConfirm(range)}/>
        ))}
    </div>
);
