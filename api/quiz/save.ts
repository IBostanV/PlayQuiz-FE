import request, { POST } from '../../utils/request';
import { USER_HISTORY_PATH } from '../constant';

// Fired once a finished run is recorded, because that is what pays experience: the navbar's
// level bar re-reads the account instead of sitting on the old number until a reload.
export const EXPERIENCE_CHANGED = 'experience-changed';

const saveUserQuiz = (body: any) => request(USER_HISTORY_PATH, {
  body,
  method: POST,
  withHeaders: true,
}).then((response) => {
  if (response) {
    window.dispatchEvent(new Event(EXPERIENCE_CHANGED));
  }
  return response;
});

export default saveUserQuiz;
