import React from "react";
import {AnswerCard} from "../answer-card";

// What a pick reports. Glossary answers by termId (the default, what the quizzes built from the
// glossary are scored by); a player's own questions have no terms, so theirs pass answer.id.
const byTermId = (answer) => answer.termId;

export const SingleOption = ({ currentQuestion, handleAnswer, pickKey = byTermId }) => (
    <div className="answer-grid">
        {currentQuestion?.answers?.map((answer, index) => (
            <AnswerCard key={pickKey(answer) || answer.content}
                        answer={answer}
                        index={index}
                        onClick={() => handleAnswer(pickKey(answer))} />
        ))}
    </div>
);
