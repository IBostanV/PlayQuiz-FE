import request, { POST } from '../../utils/request';
import { SEASON_PATH } from '../constant';
import { COINS_CHANGED } from '../coin';

// The season pass: { number, startsAt, endsAt, weekEndsAt (epoch ms), points, tierPoints,
//   quests: [{ code, progress, target, points, completed, awarded }],
//   tiers: [{ tier, points, coins, item (a cosmetic's code) | null, unlocked, claimed }] }
// Reading it also pays the week's finished quests.
export const getSeason = () => request(SEASON_PATH);

// Takes a tier's reward; resolves to the pass as it now stands.
export const claimTier = (tier: number) => request(`${SEASON_PATH}/tiers/${tier}/claim`, { method: POST })
  .then((season) => {
    if (season) window.dispatchEvent(new Event(COINS_CHANGED));
    return season;
  });
