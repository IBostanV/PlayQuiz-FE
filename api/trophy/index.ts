import request, { PATCH } from '../../utils/request';
import { TROPHY_PATH } from '../constant';

// The trophy shelf. Reading it is also what records anything newly earned, so there is nothing
// to claim: every row comes back as
//
// { code, group, title, description, icon, secret, categoryId, progress, target, earned,
//   earnedDate, preferred }
//
// A secret trophy that has not been earned arrives with no title, description or icon — that is
// the point of it.
export const getTrophies = () => request(TROPHY_PATH);

// The trophy shown beside the player's name; an empty code clears it. Only an earned trophy is
// accepted. Resolves to the shelf as it stands after.
export const preferTrophy = (code: string | null) =>
  request(`${TROPHY_PATH}/preferred`, { body: { code }, method: PATCH });
