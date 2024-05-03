import request, { POST } from '../../utils/request';
import { QUIZ_PATH } from '../constant';

// A quiz the user builds themselves out of questions they write, each with its right answers and
// optional wrong options; invitedUserIds get an invite to play it. The server saves the questions
// as CUSTOM ones.
// Resolves to the created quiz, undefined on failure (request helper toasts).
const createCustomQuiz = (body: {
  // A Q_QUIZ_TYPE id: how every question is played.
  quizTypeId: number;
  questions: { content: string; answers: string[]; wrongAnswers: string[] }[];
  timePerQuestion: number;
  categoryIds: number[];
  invitedUserIds: number[];
}) => request(`${QUIZ_PATH}/custom`, {
  body,
  method: POST,
});

export default createCustomQuiz;
