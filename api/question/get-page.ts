import { QUESTION_PATH } from '../constant';
import request from '../../utils/request';

// One page of questions: { content, page (0-based), size, totalElements, totalPages }.
// `query` searches question text, topic and category name on the server; `sort` is a column
// key (topic, priority, type, complexityLevel, content, category, isActive) with `direction`
// asc|desc. Without a sort the server returns newest first.
const getQuestionPage = (page: number, size: number, query?: string, sort?: string, direction?: string) =>
  request(`${QUESTION_PATH}/page`, {
    params: { page, size, ...(query ? { query } : {}), ...(sort ? { sort, direction } : {}) },
  });

export default getQuestionPage;
