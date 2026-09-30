import request, { PUT } from '../../utils/request';
import { USER_PATH } from '../constant';

// Ids of the groups the signed-in user has muted.
export const getMutedGroups = () => request(`${USER_PATH}/groups/muted`);

// Mute or unmute one group for the signed-in user only. Resolves to the response on success,
// undefined on failure (the request helper toasts the error).
export const setGroupMuted = (groupId: number | string, muted: boolean) => request(`${USER_PATH}/groups/${groupId}/mute`, {
  body: { muted },
  method: PUT,
  withHeaders: true,
});
