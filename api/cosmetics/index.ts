import request, { DELETE, POST } from '../../utils/request';
import { COSMETICS_PATH } from '../constant';
import { COINS_CHANGED } from '../coin';

// Frames and name colours. Every call resolves to the catalog as it now stands:
// { coins, items: [{ code, type: 'FRAME' | 'NAME_COLOR', price | null (season-pass only), color, seasonal, owned, worn }] }
// A change fires COINS_CHANGED, which is what makes the navbar re-read the account (coins and what is worn).
const changed = (catalog) => {
  if (catalog) window.dispatchEvent(new Event(COINS_CHANGED));
  return catalog;
};

export const getCosmetics = () => request(COSMETICS_PATH);

export const buyCosmetic = (code: string) => request(`${COSMETICS_PATH}/${code}/buy`, { method: POST }).then(changed);

export const wearCosmetic = (code: string) => request(`${COSMETICS_PATH}/${code}/wear`, { method: POST }).then(changed);

export const takeOffCosmetic = (type: string) => request(`${COSMETICS_PATH}/worn/${type}`, { method: DELETE }).then(changed);
