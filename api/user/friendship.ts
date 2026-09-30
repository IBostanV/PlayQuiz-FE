import { USER_PATH } from '../constant';
import request, { DELETE, POST } from '../../utils/request';

// Friendship is mutual server-side: adding someone puts you in their list too.
export const addFriend = (friendId: number) => request(`${USER_PATH}/friends/${friendId}`, {
  method: POST,
  withHeaders: true,
});

export const removeFriend = (friendId: number) => request(`${USER_PATH}/friends/${friendId}`, {
  method: DELETE,
  withHeaders: true,
});
