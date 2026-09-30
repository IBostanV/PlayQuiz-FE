import { QUESTION_PATH } from '../constant';
import request, { POST } from '../../utils/request';

// Home page mini game (public). No question answers 204, which resolves to the bare response,
// so check for an id.
export const getMiniGameQuestion = () => request(`${QUESTION_PATH}/mini-game`);

// Resolves to { correct, answerId, termId, content }: the verdict and the right option.
export const checkMiniGameAnswer = (questionId: number, option: { id?: number, termId?: number }) =>
  request(`${QUESTION_PATH}/mini-game/${questionId}/check`, {
    body: { id: option.id, termId: option.termId },
    method: POST,
  });
