import request, { DELETE } from '../../utils/request';
import { QUIZ_PATH } from '../constant';

// Removes a custom quiz with its questions, its invitations and every run of it. Its creator and
// the admins may do this. Resolves to the response on success, undefined on failure (the request
// helper toasts the error).
export default (quizId: number) => request(`${QUIZ_PATH}/custom/${quizId}`, {
  method: DELETE,
  withHeaders: true,
});
