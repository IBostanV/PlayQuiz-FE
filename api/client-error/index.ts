import request, { DELETE } from '../../utils/request';
import { CLIENT_ERROR_PATH } from '../constant';

// Admin-only: the errors players' browsers sent in (utils/report-error.js sends them).

// The newest 200, newest first:
// [{ id, kind, message, stack, page, userAgent, from: { id, displayName } | null (a guest), sentAt }]
export const getClientErrors = () => request(CLIENT_ERROR_PATH);

// Every stored one, past the 200 listed too.
export const getClientErrorCount = () => request(`${CLIENT_ERROR_PATH}/count`);

export const deleteClientError = (clientErrorId: number) =>
  request(`${CLIENT_ERROR_PATH}/${clientErrorId}`, { method: DELETE });

export const clearClientErrors = () => request(CLIENT_ERROR_PATH, { method: DELETE });
