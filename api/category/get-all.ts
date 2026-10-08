import { CATEGORY_PATH } from '../constant';
import request from '../../utils/request';

const getCategories = () => request(`${CATEGORY_PATH}/all-categories`);

export default getCategories;

// The ids of the categories with at least one question a quiz of this type (its bit value, '0' for
// any) can ask at this difficulty (a band's "from-to" like '1-3', '' for any): their own questions
// only, not their subcategories'.
export const getCategoryIdsWithQuestions = (quizType: string, complexity = '') => {
    const [from, to] = complexity.split('-').map(Number);
    const band = from && to ? `&complexityFrom=${from}&complexityTo=${to}` : '';
    return request(`${CATEGORY_PATH}/with-questions?quizType=${quizType}${band}`);
};
