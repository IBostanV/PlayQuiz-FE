import request, { DELETE, POST } from '../../utils/request';
import { ANNOUNCEMENT_PATH } from '../constant';

// An announcement: { announcementId, title, content, createdDate }.

// Where a sent one is pushed, to every signed-in player's socket (context/chat-notifications).
export const ANNOUNCEMENT_TOPIC = '/party/announcement';

// The signed-in player's not yet dismissed, oldest first.
export const getUnseenAnnouncements = () => request(`${ANNOUNCEMENT_PATH}/unseen`);

// Dismisses this one and every older one.
export const markAnnouncementSeen = (announcementId: number) =>
  request(`${ANNOUNCEMENT_PATH}/${announcementId}/seen`, { method: POST });

// Admin only from here on.
export const getAnnouncements = () => request(ANNOUNCEMENT_PATH);

export const sendAnnouncement = (title: string, content: string) =>
  request(ANNOUNCEMENT_PATH, { body: { title, content }, method: POST });

export const deleteAnnouncement = (announcementId: number) =>
  request(`${ANNOUNCEMENT_PATH}/${announcementId}`, { method: DELETE });
