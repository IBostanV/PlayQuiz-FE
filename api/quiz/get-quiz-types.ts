import { QUIZ_PATH } from '../constant';
import request from '../../utils/request';

// Backend sends enum names ("SINGLE_CHOICE"). Add a display label ("Single choice") and leave
// `name` untouched — the whole type object is POSTed back as `excludeQuizTypes` on save.
export const toLabel = (name: string) => {
  const words = name?.replace(/_/g, ' ').toLowerCase();
  return words?.charAt(0).toUpperCase() + words?.slice(1);
};

export default () => request(`${QUIZ_PATH}/types`)
  .then((types) => types?.map((type) => ({ ...type, label: toLabel(type.name) })));
