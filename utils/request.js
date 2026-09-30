import axios from 'axios';
import Qs from 'qs';
import { getCookie, hasCookie } from 'cookies-next';
import { toast } from 'react-toastify';
import { CSRF_TOKEN_URL } from '../api/constant';

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
    .catch(({ response }) => {
      // The session ended (signing out, or an expired token): requests already in flight, and
      // any the page fires before it notices, come back 401/403. There is nothing to tell the
      // user about that — they just signed out. A refusal while still signed in is a real
      // error and still shows.
      if (response && [401, 403].includes(response.status) && !hasCookie('authorization')) {
        return undefined;
      }

      const message = (error) => (
        <div>
          Status code:
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
