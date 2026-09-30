import request, { POST } from '../../utils/request';
import { LEADERBOARD_PATH, SOCIAL_PATH } from '../constant';

// Playing with others without being online together.

// "Beat my score": sends a finished run to friends, who play the same questions.
// Resolves to the challenges made: [{ id, quizId, category, challenger, opponent,
//   challengerScore: { rightAnswers, totalAnswers, spentTime, at }, opponentScore | null,
//   createdDate, outcome: 'WON' | 'LOST' | 'DRAW' | null (the challenger's) }]
export const sendChallenge = (historyId: number, friendIds: number[]) =>
  request(`${SOCIAL_PATH}/challenges`, { body: { historyId, friendIds }, method: POST });

// { received: [...], sent: [...] }, the last month's, newest first.
export const getChallenges = () => request(`${SOCIAL_PATH}/challenges`);

// The challenge's quiz, the same questions the challenger had, ready to play.
export const getChallengeQuiz = (challengeId: number | string) =>
  request(`${SOCIAL_PATH}/challenges/${challengeId}/quiz`);

// Today's challenge: { day, questions, players, played, you: Entry | null, top: Entry[], closesAt }
// where Entry is { rank, user, rightAnswers, totalAnswers, spentTime }.
export const getDailyChallenge = () => request(`${SOCIAL_PATH}/daily`);

// Today's questions, once per player.
export const getDailyChallengeQuiz = () => request(`${SOCIAL_PATH}/daily/quiz`);

// A chat group's table: [{ rank, user, quizzes, rightAnswers, totalAnswers, accuracy }].
export const getGroupLeaderboard = (groupId: number | string, period: 'WEEK' | 'MONTH' = 'WEEK') =>
  request(`${SOCIAL_PATH}/groups/${groupId}/leaderboard`, { params: { period } });

// Reactions on news lines, by feed key: { [key]: [{ kind, count, mine }] }, every kind listed.
export const REACTIONS = { FIRE: '🔥', CLAP: '👏', WOW: '😮', HEART: '❤️' };
export const getReactions = (keys: string[]) =>
  keys.length ? request(`${SOCIAL_PATH}/reactions`, { params: { keys: keys.join(',') } }) : Promise.resolve({});

// Adds the reader's reaction, or takes it back; resolves to that line's tallies.
export const toggleReaction = (key: string, kind: string) =>
  request(`${SOCIAL_PATH}/reactions`, { body: { key, kind }, method: POST });

// Friends on the site now: [{ id, activity: 'DUEL' | 'ROOM' | null }].
export const getOnlineFriends = () => request(`${SOCIAL_PATH}/online`);

// The site-wide tables, for everyone: { board, period, players, minAnswers, top: Entry[], you }
// where Entry is { rank, user, value, extra }. value: quizzes, percent right, right answers, level
// or days; extra: answers counted (accuracy), answers given (right answers), experience (level).
// LEVEL and STREAK have no period and come back as ALL.
export const getLeaderboard = (board: string, period: 'WEEK' | 'MONTH' | 'ALL') =>
  request(LEADERBOARD_PATH, { params: { board, period } });
