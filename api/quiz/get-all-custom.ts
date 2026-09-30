import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// Admin-only: every custom quiz, newest first:
// [{ quizId, quizType, questionsCount, questionTime, createdAt, createdBy: { id, displayName },
//    invited, played }]
export default () => request(`${QUIZ_PATH}/custom/all`);
