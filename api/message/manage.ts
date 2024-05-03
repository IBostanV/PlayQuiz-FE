import request, { DELETE, PUT } from '../../utils/request';

const MESSAGE_PATH = '/api/message';

// Only the author may do either; every member of the group gets the change live over the
// socket (an EDITED or DELETED event), so the caller need not refresh anything else.
export const editMessage = (messageId: number, content: string) => request(`${MESSAGE_PATH}/${messageId}`, {
  body: { content },
  method: PUT,
  withHeaders: true,
});

export const deleteMessage = (messageId: number) => request(`${MESSAGE_PATH}/${messageId}`, {
  method: DELETE,
  withHeaders: true,
});
