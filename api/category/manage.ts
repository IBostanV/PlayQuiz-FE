import { CATEGORY_PATH } from '../constant';
import request from '../../utils/request';

// Every category, hidden ones too; content roles only. Players' pages use get-all (visible only).
const getManagedCategories = () => request(`${CATEGORY_PATH}/manage`);

export default getManagedCategories;
