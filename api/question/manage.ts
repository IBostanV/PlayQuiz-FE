import request, { DELETE, PUT } from '../../utils/request';
import { QUESTION_PATH } from '../constant';

// The question's own fields; its answers and translations are kept as they are.
export const updateQuestion = (questionId: number, body) => request(`${QUESTION_PATH}/${questionId}`, {
  body,
  method: PUT,
  withHeaders: true,
});

// Deletes the question with its answers and translations.
export const deleteQuestion = (questionId: number) => request(`${QUESTION_PATH}/${questionId}`, {
  method: DELETE,
  withHeaders: true,
});
