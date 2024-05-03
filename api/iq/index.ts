import request, { POST } from '../../utils/request';
import { IQ_PATH } from '../constant';

// The IQ test. Which question comes next, which answer is right and how long the question was on
// screen are all the server's business: the browser draws what it is sent and says what was
// clicked. Every call answers the same shape:
//
// { question: { type, payload, options, number, total, seconds } | null, finished, result | null }

export const startIqTest = () => request(`${IQ_PATH}/start`, { method: POST });

// `chosen` is the option index, or -1 for a question the timer ran out on.
export const answerIqTest = (chosen: number) =>
  request(`${IQ_PATH}/answer`, { body: { chosen }, method: POST });

// { iq, low, high, percentile, theta, standardError, normed, items, attemptNo, finishedDate },
// or nothing at all when this player has never finished a test (the endpoint answers 204).
export const getLatestIqResult = () => request(`${IQ_PATH}/latest`);
