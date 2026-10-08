import request, { DELETE, POST, PUT } from '../../utils/request';
import { BACKGROUNDS_PATH, USER_PATH } from '../constant';

// The signed-in player's own look of the site. Every setting is optional; null is the site as it
// comes, so a reset is the setting sent back as null.
//
// { accent: '#rrggbb' | null, textSize: 90 | 100 | 110 | 125 | null,
//   motion: 'ON' | 'OFF' | null (null follows the system's reduce-motion setting), compactNav, hideTourLink,
//   friendsDock: 'LEFT' | 'RIGHT' | null, homeFriends: 'RIGHT' | 'LEFT' | 'BELOW' | null,
//   background: one of the site's (public/backgrounds/<name>.svg) | 'custom' | null (the logo),
//   customBackground: the uploaded picture's id, set by the server only }
export const getAppearance = () => request(`${USER_PATH}/appearance`);

// Replaces them all and resolves to what was stored.
export const saveAppearance = (appearance) =>
  request(`${USER_PATH}/appearance`, { body: appearance, method: PUT });

// The player's own background, as the bare image (already scaled and compressed); it replaces the
// one they had and is put to use. Resolves to the appearance.
export const uploadBackground = (image: Blob) =>
  request(`${USER_PATH}/appearance/background`, {
    body: image, method: POST, headers: { 'Content-Type': image.type },
  });

export const removeBackground = () =>
  request(`${USER_PATH}/appearance/background`, { method: DELETE });

// Where an uploaded background is: a fixed address per upload, which the browser keeps for good.
export const customBackgroundUrl = (id: string) =>
  `${process.env.NEXT_PUBLIC_BE_HOST_URL}${BACKGROUNDS_PATH}/${id}`;

// One of the site's own.
export const presetBackgroundUrl = (name: string) => `/backgrounds/${name}.svg`;
