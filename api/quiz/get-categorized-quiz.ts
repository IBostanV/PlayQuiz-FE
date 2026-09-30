import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// quizType comes off the router query, so it is a string. 'All' is 0 and the param can be
// missing entirely — both mean no type filter, so the param is omitted rather than sent as 0.
// complexity is a difficulty band's "from-to" (e.g. '1-3'); missing means any difficulty.
// length is how many questions to ask; missing means the system's default length.
const getCategorizedQuiz = (categoryId: number | string, quizType?: number | string, complexity?: string,
                            length?: number | string) => {
  const type = Number(quizType);
  const [from, to] = String(complexity ?? '').split('-').map(Number);
  const questionCount = Number(length);

  return request(`${QUIZ_PATH}/categorized/${categoryId}`, {
    params: {
      ...(type > 0 ? { quizType: type } : {}),
      ...(from && to ? { complexityFrom: from, complexityTo: to } : {}),
      ...(questionCount > 0 ? { questionCount } : {}),
    },
  });
};

export default getCategorizedQuiz;
