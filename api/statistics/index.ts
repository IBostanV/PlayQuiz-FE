import request from '../../utils/request';
import { STATISTICS_PATH } from '../constant';

// A player's statistics over a day, a week or a month: the signed-in player's own, or, given a
// userId, another player's for their profile page.
//
// { period, from, to, quizzes, rightAnswers, wrongAnswers, accuracy, secondsPerQuestion,
//   secondsPerQuiz, minutesPlayed, trophies, activeDays, loginStreak,
//   topCategory, strongest: [...], weakest: [...], byDay: [{day, quizzes, rightAnswers,
//   totalAnswers}], trend: {quizzesBefore, accuracyBefore, quizzesChange, accuracyChange} }
export const getStatistics = (period: 'DAY' | 'WEEK' | 'MONTH', userId?: number | string) =>
  request(userId ? `${STATISTICS_PATH}/${userId}` : STATISTICS_PATH, { params: { period } });
