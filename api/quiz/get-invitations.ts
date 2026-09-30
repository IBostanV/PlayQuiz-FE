import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// The custom quizzes the signed-in player was invited to, newest first:
// [{ quizId, quizType, questionsCount, questionTime, invitedBy: { id, displayName }, invitedAt, played }]
export default () => request(`${QUIZ_PATH}/custom/invitations`);
