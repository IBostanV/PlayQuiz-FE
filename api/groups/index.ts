import request, { DELETE, POST } from '../../utils/request';
import { GROUPS_PATH } from '../constant';

// Groups players create and post in (not chat groups). A card is
// { id, name, description, privateGroup, members, owner: { id, displayName }, role: 'OWNER' | 'MEMBER' | 'PENDING' | null }
// and a page { group: card, canRead, members: [user], pending: [user] (the owner's to answer) }.

// { mine: [card], others: [card] }
export const getGroups = () => request(GROUPS_PATH);

export const createGroup = (name: string, description: string, privateGroup: boolean) =>
  request(GROUPS_PATH, { body: { name, description, privateGroup }, method: POST });

export const getGroup = (groupId: number | string) => request(`${GROUPS_PATH}/${groupId}`);

export const deleteGroup = (groupId: number | string) => request(`${GROUPS_PATH}/${groupId}`, { method: DELETE });

// Joins a public group, asks to join a private one; resolves to the page.
export const joinGroup = (groupId: number | string) => request(`${GROUPS_PATH}/${groupId}/join`, { method: POST });

// Leaves, or takes back a request to join.
export const leaveGroup = (groupId: number | string) => request(`${GROUPS_PATH}/${groupId}/leave`, { method: POST });

// The owner's: let in someone who asked, or remove a member / turn a request down. Resolve to the page.
export const approveMember = (groupId: number | string, accountId: number) =>
  request(`${GROUPS_PATH}/${groupId}/members/${accountId}`, { method: POST });

export const removeMember = (groupId: number | string, accountId: number) =>
  request(`${GROUPS_PATH}/${groupId}/members/${accountId}`, { method: DELETE });

// Newest first: [{ id, key (for reactions), author: { id, displayName }, content, at, canDelete,
//   comments: [{ id, author, content, at, canDelete }] (oldest first) }]
export const getGroupPosts = (groupId: number | string) => request(`${GROUPS_PATH}/${groupId}/posts`);

export const postInGroup = (groupId: number | string, content: string) =>
  request(`${GROUPS_PATH}/${groupId}/posts`, { body: { content }, method: POST });

export const deleteGroupPost = (postId: number) => request(`${GROUPS_PATH}/posts/${postId}`, { method: DELETE });

// A member's comment under a post: resolves to { id, author, content, at, canDelete }.
export const commentOnPost = (postId: number, content: string) =>
  request(`${GROUPS_PATH}/posts/${postId}/comments`, { body: { content }, method: POST });

export const deleteComment = (commentId: number) => request(`${GROUPS_PATH}/comments/${commentId}`, { method: DELETE });
