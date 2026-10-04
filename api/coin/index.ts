import request, { POST } from '../../utils/request';
import { COIN_PATH } from '../constant';

// Fired after anything that changes the balance, so the navbar's coin count re-reads the account.
export const COINS_CHANGED = 'coins-changed';

// Prices, kept in step with Coins.java by hand: they are only shown here, the server charges.
export const PRICES = { STREAK_FREEZE: 100, HINT: 15, EXTRA_TIME: 10 };
export const EXTRA_TIME_SECONDS = 30;
export const STREAK_FREEZE_MAX = 2;

// Every purchase resolves to { coins, remove } — the balance after, and for a hint the termIds of
// the options to take away — or to undefined if it was refused (the toast says why).
const buy = (path: string, body?: unknown) => request(`${COIN_PATH}${path}`, { method: POST, body })
  .then((purchase) => {
    if (purchase) window.dispatchEvent(new Event(COINS_CHANGED));
    return purchase;
  });

export const buyStreakFreeze = () => buy('/streak-freeze');
export const buyHint = (questionId: number, shownTermIds: number[]) => buy(`/hint/${questionId}`, shownTermIds);
export const buyExtraTime = () => buy('/extra-time');
