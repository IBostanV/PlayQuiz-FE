export { default as logout } from './logout';
export { default as authenticate } from './authenticate';

const AUTH_PATH = '/auth';

export const LOGOUT_URL = '/logout';
export const LOGIN_URL = `${AUTH_PATH}/login`;
export const REGISTER_URL = `${AUTH_PATH}/register`;
export const CSRF_TOKEN_URL = `${AUTH_PATH}/create-token`;
