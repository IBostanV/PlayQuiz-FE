import { CATEGORY_PATH } from '../constant';
import request from '../../utils/request';

const getShortCategories = () => request(`${CATEGORY_PATH}/all-categories-short`);

export default getShortCategories;
