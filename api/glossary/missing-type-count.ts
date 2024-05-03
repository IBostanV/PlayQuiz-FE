import { GLOSSARY_PATH } from '../constant';
import request from '../../utils/request';

// Terms still without a glossary type. Their questions have nothing plausible to draw wrong
// options from, so the content dashboard shows the number beside Glossaries until it is zero.
const getMissingTypeCount = (): Promise<number | undefined> =>
  request(`${GLOSSARY_PATH}/missing-type-count`);

// Fired after a glossary is saved or deleted, so the badge follows without a reload.
export const GLOSSARY_CHANGED = 'glossary-changed';

export default getMissingTypeCount;
