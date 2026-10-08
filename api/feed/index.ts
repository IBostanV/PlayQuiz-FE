import request, { DELETE, POST, PUT } from '../../utils/request';
import { FEED_PATH } from '../constant';

// Notifications (what happened to you) and news (what happened around you). Every line is
//
// { key, type, at, title?, text?, url?, refId?, name?, count?, user?, names?, levels?, own? }
//
// and the server sends what happened, not the sentence: components/feed/feed-line.jsx words it.
// Which fields each type fills is listed on the backend's FeedItem.

// The signed-in player's own, newest first: { unread, items }. Reading it also records any trophy
// just earned, so one won by a quiz shows up here without opening the trophies page.
export const getNotifications = () => request(`${FEED_PATH}/notifications`);

// Fired when something new for the bell was pushed over the socket, so it reads the list at once.
export const NOTIFICATIONS_CHANGED = 'notifications-changed';

// Everything up to now counts as seen.
export const markNotificationsRead = () => request(`${FEED_PATH}/notifications/read`, { method: POST });

// Reads signed out too; friends' news is only there for a signed-in player, and the kinds they
// switched off are left out.
export const getNews = () => request(`${FEED_PATH}/news`);

// The news kinds a player can switch off.
export const NEWS_KINDS = ['PATCH', 'QUESTIONS_ADDED', 'FRIEND_LEVELS', 'FRIEND_CONQUEST', 'FRIEND_POST', 'WORLD'];

// What friends did: shown apart from the rest of the news, on the home page and the News page.
export const FRIEND_KINDS = ['FRIEND_POST', 'FRIEND_CONQUEST', 'FRIEND_LEVELS'];

// The kinds the signed-in player has switched off: ['WORLD', ...]. Saving replaces the whole list
// and resolves to it as stored.
export const getHiddenNews = () => request(`${FEED_PATH}/hidden-news`);
export const setHiddenNews = (hidden: string[]) =>
  request(`${FEED_PATH}/hidden-news`, { body: hidden, method: PUT });

// Any signed-in player: an admin's post is a patch note for everyone, anyone else's a friend post
// (FRIEND_POST) for them and their friends. Resolves to the new line.
export const postNews = (title: string, content: string) =>
  request(`${FEED_PATH}/news`, { body: { title, content }, method: POST });

// A post's author can delete it, and an admin can delete any.
export const deleteNews = (newsId: number) => request(`${FEED_PATH}/news/${newsId}`, { method: DELETE });
