import request from '../../utils/request';
import { REVIEW_PATH } from '../constant';

// The mistakes deck: questions the player got wrong, back on a 1-3-7 day ladder until answered
// right three times. { due, total, nextDue: date | null, boxes: [count in box 0, 1, 2] }
export const getReviewStatus = () => request(REVIEW_PATH);

// The questions due today (up to ten), as a quiz to play; marking the run moves them up or down.
export const getReviewQuiz = () => request(`${REVIEW_PATH}/quiz`);
