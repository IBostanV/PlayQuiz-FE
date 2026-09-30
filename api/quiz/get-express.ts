import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

export default () => request(`${QUIZ_PATH}/express`);
