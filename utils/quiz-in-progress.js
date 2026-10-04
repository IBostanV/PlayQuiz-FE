import {useEffect} from 'react';

// Whether a quiz of any kind is being played right now, so what would interrupt it (announcements)
// can wait. Each quiz page calls useQuizInProgress(running); QUIZ_ENDED fires when the last one stops.
export const QUIZ_ENDED = 'pq:quiz-ended';

let running = 0;

export const quizInProgress = () => running > 0;

export const useQuizInProgress = (active) => {
    useEffect(() => {
        if (!active) return undefined;
        running += 1;
        return () => {
            running -= 1;
            if (!running) window.dispatchEvent(new Event(QUIZ_ENDED));
        };
    }, [active]);
};
