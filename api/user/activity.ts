import { USER_PATH } from '../constant';
import request, { PUT } from '../../utils/request';

// What a player has been doing, if they let the reader see it:
// { visibility: 'PUBLIC' | 'FRIENDS' | 'PRIVATE', visible, history: [run], likes: [liked post],
//   posts: [{ id, title, text, patch, at }], articles: [{ id, title, category, at }],
//   friends: [user], groups: [group card] }. Everything but visibility is empty when not visible.
export const getUserActivity = (userId: number | string) => request(`${USER_PATH}/${userId}/activity`);

// Who may see the signed-in player's activity.
export const setProfileVisibility = (visibility: string) =>
  request(`${USER_PATH}/profile-visibility`, { body: { visibility }, method: PUT });
