import { USER_PATH } from '../constant';
import request, { POST } from '../../utils/request';

// The site tour was finished or skipped: kept on the account, so it is not offered again anywhere.
export const markTourSeen = () => request(`${USER_PATH}/tour-seen`, { method: POST });
