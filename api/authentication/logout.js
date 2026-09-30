import request, { POST } from '../../utils/request';
import { deleteCookie } from 'cookies-next';
import { CSRF_TOKEN_URL, LOGOUT_URL } from '../constant';

const logout = () => request(CSRF_TOKEN_URL)
  .then(() => request(LOGOUT_URL, {
    method: POST,
    withHeaders: true
  }))
  .finally(() => {
    deleteCookie('authorization');
    // Identity must not outlive the session — pages read userId to recognise the current
    // user (e.g. to leave them out of user pickers). langCode/langId stay, they are a UI
    // preference, not identity.
    localStorage.removeItem('userId');
  });

export default logout;
