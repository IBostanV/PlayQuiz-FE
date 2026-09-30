import request, { POST } from '../../utils/request';
import { USER_PATH } from '../constant';
import { shrinkToAvatar } from '../../utils/shrinkImage';

const saveProfileInfo = async (body, avatar) => {
  const formData = new FormData();

  formData.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));

  // Shrunk to avatar size: it is shown in the top bar and in other players' friends lists.
  if (avatar) {
    formData.append('avatar', await shrinkToAvatar(avatar), 'avatar.jpg');
  }

  return request(USER_PATH, {
    body: formData,
    method: POST,
    withHeaders: true,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export default saveProfileInfo;