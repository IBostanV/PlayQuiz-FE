import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// The custom quizzes the signed-in player made, newest first:
// [{ quizId, quizType, questionsCount, questionTime, createdAt, invited, played }]
export default () => request(`${QUIZ_PATH}/custom/mine`);
