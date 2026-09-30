import { KNOWLEDGE_BASE_PATH } from '../constant';
import request, { POST } from '../../utils/request';

// Published records only (visible, ACTIVE or no status), optionally filtered server-side by a
// search over title, content and tags.
export const getPublishedRecords = (query?: string) =>
  request(`${KNOWLEDGE_BASE_PATH}/records`, query ? { params: { query } } : {});

// { record, parent, children } — the article, the topic above it and its sub-articles.
export const getArticle = (id: number | string) => request(`${KNOWLEDGE_BASE_PATH}/records/${id}`);

// "Was this helpful?" Resolves to the record with its updated counts.
export const voteArticle = (id: number | string, helpful: boolean) =>
  request(`${KNOWLEDGE_BASE_PATH}/records/${id}/vote`, { body: { helpful }, method: POST });

// Home page "Did you know": today's record (the same for everyone all day). Nothing published
// answers 204, which resolves to the bare response, so check for an id.
export const getDailyRecord = () => request(`${KNOWLEDGE_BASE_PATH}/records/daily`);
