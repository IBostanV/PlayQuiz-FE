import { CATEGORY_PATH } from '../constant';

// A category's picture as its own URL, for an <img> the browser can load in parallel and cache.
// Only for a category whose `hasImage` is set; the rest have nothing there.
const categoryImageUrl = (categoryId: number) =>
  `${process.env.NEXT_PUBLIC_BE_HOST_URL}${CATEGORY_PATH}/${categoryId}/image`;

export default categoryImageUrl;
