import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// A custom quiz to play: { quiz, questions: [{ id, content, answers: [{ id, content }] }] }, the
// options shuffled and none marked right (a typed-answer quiz sends none). Only for its creator and
// the people invited; anyone else gets 403 (toasted by the request helper) and this resolves to
// undefined.
export default (quizId: number | string) => request(`${QUIZ_PATH}/custom/${quizId}`);
