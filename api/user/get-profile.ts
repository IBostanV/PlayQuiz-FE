import { USER_PATH } from '../constant';
import request from '../../utils/request';

// Another player's profile, read-only: names, photo, level, trophy, occupations, favourite
// categories and IQ result. No email, birthday or quiz history; the server leaves those out.
export default (userId: number | string) => request(`${USER_PATH}/${userId}/profile`);
