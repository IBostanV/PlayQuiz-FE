import { USER_HISTORY_PATH } from '../constant';
import request from '../../utils/request';

export default (historyId: number) => request(`${USER_HISTORY_PATH}/history/${historyId}`);
