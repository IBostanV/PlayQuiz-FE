import request, { PUT } from '../../utils/request';
import { CATEGORY_PATH } from '../constant';

// Name, parent and visibility; the image only changes when `attachment` is given.
const updateCategory = (categoryId: number, body, attachment?: File) => {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));
  if (attachment) {
    formData.append('attachment', attachment, attachment.name);
  }

  return request(`${CATEGORY_PATH}/${categoryId}`, {
    body: formData,
    method: PUT,
    withHeaders: true,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export default updateCategory;
