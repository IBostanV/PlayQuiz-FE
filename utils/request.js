import axios from 'axios';
import Qs from 'qs';
import { deleteCookie, getCookie, hasCookie, setCookie } from 'cookies-next';
import { toast } from 'react-toastify';
import { CSRF_TOKEN_URL } from '../api/constant';
import { reportError } from './report-error';
import i18n from 'i18next';

export const POST = 'post';
export const GET = 'get';
export const DELETE = 'delete';
export const PUT = 'put';
export const PATCH = 'patch';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BE_HOST_URL,
  withCredentials: true,
  paramsSerializer: {
    serialize: (params) => Qs.stringify(params, { arrayFormat: 'brackets' }),
  },
});

// The token lasts an hour and every signed-in answer brings a fresh one, so a player who keeps
// playing stays signed in. Only while signed in: a reply to a request sent before signing out
// must not sign the player back in. A token the server turned away (expired after a long break,
// account blocked) ends the session here too, instead of every page failing with a 403.
const followToken = (response) => {
  if (!response || !hasCookie('authorization')) {
    return;
  }
  if (response.headers?.['x-token-rejected']) {
    deleteCookie('authorization');
    localStorage.removeItem('userId');
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  } else if (response.headers?.authorization) {
    setCookie('authorization', response.headers.authorization);
  }
};

axiosInstance.interceptors.response.use(
  (response) => {
    followToken(response);
    return response;
  },
  (error) => {
    followToken(error.response);
    return Promise.reject(error);
  },
);

const axiosRequest = (url, params = {}) => {
  const options = {
    url,
    method: GET,
    withHeaders: false,
    ...{
      ...params,
      headers: {
        ...params.headers,
        ...(hasCookie('authorization') ? { Authorization: `Bearer ${getCookie('authorization')}` } : undefined),
        // The server writes its messages (errors, trophies, emails) in the player's language.
        'Accept-Language': i18n.language || 'EN',
        // The visit streak counts the player's own days, not the server's.
        'X-Time-Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'X-XSRF-TOKEN': params.xsrfToken
      }
    },
  };

  let request;

  switch (options.method) {
    case POST:
    case PATCH:
    case PUT:
      request = axiosInstance[options.method](url, params.body, options);
      break;
    default:
      request = axiosInstance(options);
      break;
  }

  // A body of 0 or false is still a body: only a missing one falls back to the whole response
  // (which is what callers of endpoints with no content expect).
  const unwrap = (response) => {
    const { data } = response;
    return (data === undefined || data === null || data === '') ? response : data;
  };

  return request.then((response) => (params.withHeaders) ? response : unwrap(response))
    .catch((error) => {
      const { response } = error;
      // The session ended (signing out, or an expired token): requests already in flight, and
      // any the page fires before it notices, come back 401/403. There is nothing to tell the
      // user about that — they just signed out. A refusal while still signed in is a real
      // error and still shows.
      if (response && [401, 403].includes(response.status) && !hasCookie('authorization')) {
        return undefined;
      }

      // An answer from the server is already in its own log. No answer (offline, CORS, timeout)
      // is only known here, so that one is reported.
      if (response) {
        console.error(`[PlayQuiz] ${options.method.toUpperCase()} ${url} failed`,
            { status: response.status, data: response.data });
      } else {
        reportError('Network error', new Error(`${options.method.toUpperCase()} ${url}: ${error.message}`));
      }

      const message = (error) => (
        <div>
          {i18n.t('status_code', 'Status code:')}{' '}
          {response.status}
          <hr/>
          {error}
        </div>
      );

      if (response) {
        if (Array.isArray(response.data)) {
          response.data.forEach(((error) => toast.error(message(error))));
        } else {
          toast.error(message(response.data));
        }
      }
    });
};

export default (url, requestOptions = {}) => {
  if ([POST, PATCH, PUT, DELETE].includes(requestOptions.method)) {
    return axiosRequest(CSRF_TOKEN_URL)
      .then((result) => axiosRequest(url, {
        ...requestOptions,
        xsrfToken: result?.token
      }));
  }
  return axiosRequest(url, requestOptions);
};
