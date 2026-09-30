import request, { PATCH, POST } from '../../utils/request';
import { FEEDBACK_PATH } from '../constant';

// Bug reports, questions and suggestions for the admins. Anyone may send one, guests included
// (the server caps it at a few per sender every ten minutes); the rest is admin-only. Each resolves
// to undefined on failure (the request helper toasts).

export type FeedbackType = 'BUG' | 'QUESTION' | 'SUGGESTION' | 'OTHER';

// question: the question a problem was reported on from inside a quiz ("Question #12: ...").
// contactEmail: a guest's optional reply address; signed-in senders are known by their account.
// screenshot: an optional picture of the problem (an image, at most the server's 2MB upload limit).
export const sendFeedback = (
  body: {
    type: FeedbackType;
    message: string;
    page?: string;
    question?: string;
    contactEmail?: string;
  },
  screenshot?: File,
) => {
  const formData = new FormData();
  formData.append('request', new Blob([JSON.stringify(body)], { type: 'application/json' }));

  if (screenshot) {
    formData.append('screenshot', screenshot, screenshot.name);
  }

  return request(FEEDBACK_PATH, {
    body: formData,
    method: POST,
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// Admin-only: one message's screenshot, as a blob to show in the browser. Kept out of the list,
// which would otherwise carry every picture at once.
export const getFeedbackScreenshot = (feedbackId: number) =>
  request(`${FEEDBACK_PATH}/${feedbackId}/screenshot`, { responseType: 'blob' });

// Open ones first, each group newest first:
// [{ id, type, message, page, question, from: { id, displayName } | null (a guest), contactEmail,
//    sentAt, resolved, hasScreenshot }]
export const getFeedback = () => request(FEEDBACK_PATH);

export const getOpenFeedbackCount = () => request(`${FEEDBACK_PATH}/open-count`);

export const setFeedbackResolved = (feedbackId: number, resolved: boolean) =>
  request(`${FEEDBACK_PATH}/${feedbackId}`, { body: { resolved }, method: PATCH });

// Fired after an admin resolves or reopens one, so the navbar badge recounts without a reload.
export const FEEDBACK_CHANGED = 'feedback-changed';
