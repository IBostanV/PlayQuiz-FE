import request, { DELETE } from '../../utils/request';
import { USER_PATH } from '../constant';

// Deletes the group and its messages for every member. Resolves to the response on success,
// undefined on failure (the request helper toasts the error).
const deleteGroup = (groupId: number | string) => request(`${USER_PATH}/groups/${groupId}`, {
  method: DELETE,
  withHeaders: true,
});

export default deleteGroup;
