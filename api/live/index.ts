import request, { POST } from '../../utils/request';
import { LIVE_PATH } from '../constant';

// Live matches. Every action answers with the room as the player sees it, and every change after
// it arrives over the socket on LIVE_TOPIC as { type: 'ROOM', room } — or { type: 'INVITE', code,
// mode, from } for an invitation, and { type: 'CLOSED', code, reason } when a room goes away.
//
// room: { code, mode: 'DUEL' | 'ROOM' | 'PAIRS',
//   phase: 'LOBBY' | 'COUNTDOWN' | 'QUESTION' | 'REVEAL' | 'TURN' | 'MISMATCH' | 'FINISHED',
//   hostId, you, index, total, seconds, endsAt, serverNow, question: { id, content, answers } | null,
//   reveal: { answerId, termId, content } | null, yourAnswer, players: [{ user, score, correct,
//   answered, lastCorrect, lastPoints, left, host }], invited: [user],
//   pairs: { cards: [face | null], takenBy: [accountId | null], turned: [card], turn: accountId } | null }
//
// PAIRS is the pairs game (2-4 players): `total` is its number of pairs, `seconds` a turn's time,
// a player's `score` the pairs they took. Its phases are TURN and MISMATCH (a wrong pair on show).
export const LIVE_TOPIC = '/user/live';

export const createRoom = (options: {
  mode: 'DUEL' | 'ROOM' | 'PAIRS', friendIds?: number[], groupId?: number | null, questions?: number, seconds?: number,
}) => request(`${LIVE_PATH}/rooms`, { body: options, method: POST });

export const getRoom = (code: string) => request(`${LIVE_PATH}/rooms/${code}`);
export const joinRoom = (code: string) => request(`${LIVE_PATH}/rooms/${code}/join`, { method: POST });
export const declineRoom = (code: string) => request(`${LIVE_PATH}/rooms/${code}/decline`, { method: POST });
export const leaveRoom = (code: string) => request(`${LIVE_PATH}/rooms/${code}/leave`, { method: POST });
// "Play again" after a match: back to the same room's lobby, reopened by the first who asks.
export const playAgain = (code: string) => request(`${LIVE_PATH}/rooms/${code}/again`, { method: POST });
export const startRoom = (code: string) => request(`${LIVE_PATH}/rooms/${code}/start`, { method: POST });
export const answerRoom = (code: string, index: number, answer: { id?: number, termId?: number }) =>
  request(`${LIVE_PATH}/rooms/${code}/answer`, { body: { index, answer }, method: POST });
export const flipCard = (code: string, card: number) =>
  request(`${LIVE_PATH}/rooms/${code}/flip`, { body: { card }, method: POST });
