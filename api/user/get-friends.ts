import { USER_PATH } from '../constant';
import request from '../../utils/request';

// Always the signed-in user's friends; the server reads who that is from the session.
export default () => request(`${USER_PATH}/friends`);
