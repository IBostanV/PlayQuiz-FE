import { USER_HISTORY_PATH } from '../constant';
import request from '../../utils/request';

// One page of the signed-in player's finished runs, newest first; `page` is 0-based. No answers:
// opening a run reads them from getUserHistoryQuiz, so the list does not carry every question of
// every run ever taken.
// { content: [{ historyId, category, quizType, custom, rightAnswers, totalAnswers, spentTime,
//               completedAt }], page, size, totalElements, totalPages }
export const getOwnHistory = (page: number, size: number) =>
  request(USER_HISTORY_PATH, { params: { page, size } });

// What the whole history adds up to, which one page cannot say on its own.
// { played, answered, rightAnswers, accuracy, best, seconds }
export const getOwnStatistics = () => request(`${USER_HISTORY_PATH}/statistics`);

export default getOwnHistory;
