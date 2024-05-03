import request, { PUT } from '../../utils/request';
import { USER_PATH } from '../constant';

// The signed-in player's own look of the site. Every setting is optional; null is the site as it
// comes, so a reset is the setting sent back as null.
//
// { accent: '#rrggbb' | null, textSize: 90 | 100 | 110 | 125 | null,
//   motion: 'ON' | 'OFF' | null (null follows the system's reduce-motion setting), compactNav,
//   friendsDock: 'LEFT' | 'RIGHT' | null, homeFriends: 'RIGHT' | 'LEFT' | 'BELOW' | null }
export const getAppearance = () => request(`${USER_PATH}/appearance`);

// Replaces them all and resolves to what was stored.
export const saveAppearance = (appearance) =>
  request(`${USER_PATH}/appearance`, { body: appearance, method: PUT });
