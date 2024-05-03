import request, { DELETE } from '../../utils/request';
import { CATEGORY_PATH } from '../constant';

// Resolves to the response on success, undefined on failure (the request helper toasts the error).
const deleteCategory = (categoryId: number) => request(`${CATEGORY_PATH}/${categoryId}`, {
  method: DELETE,
  withHeaders: true,
});

export default deleteCategory;
