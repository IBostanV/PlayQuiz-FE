import request, { PUT } from '../../utils/request';
import { USER_PATH } from '../constant';
import { shrinkToAvatar } from '../../utils/shrinkImage';

// Sets the group's picture, or clears it when given nothing. Members only; resolves to the
// response on success, undefined on failure (the request helper toasts the error).
export const setGroupPhoto = async (groupId: number | string, file?: File) => {
  const formData = new FormData();

  if (file) {
    formData.append('photo', await shrinkToAvatar(file), 'group.jpg');
  }

  return request(`${USER_PATH}/groups/${groupId}/photo`, {
    body: formData,
    method: PUT,
    withHeaders: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
