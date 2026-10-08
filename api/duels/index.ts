import request, { POST } from '../../utils/request';
import { DUELS_PATH } from '../constant';

// Turn-based duels with friends: five rounds of five questions, first to three, a day per turn.
// A duel: { id, challenger, opponent, me: 'CHALLENGER' | 'OPPONENT',
//   rounds: [{ no, challenger: score | null, opponent: score | null }] (score: { rightAnswers, totalAnswers, spentTime, at }),
//   state: { challengerWins, opponentWins, currentRound, turn, over, winner, forfeit, endedAt },
//   outcome: 'YOUR_TURN' | 'THEIR_TURN' | 'WON' | 'LOST' | 'DRAW', deadlineMillis, createdDate }

// The reader's duels: waiting on them first, then going on, then finished in the last month.
export const getDuels = () => request(DUELS_PATH);

// Starts one with a friend, or resolves to the one already going between the two.
export const startDuel = (opponentId: number) => request(DUELS_PATH, { body: { opponentId }, method: POST });

// The current round's questions, when it is the reader's turn.
export const getDuelQuiz = (duelId: number | string) => request(`${DUELS_PATH}/${duelId}/quiz`);
