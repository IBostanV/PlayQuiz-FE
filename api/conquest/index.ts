import request, { POST, PUT } from '../../utils/request';
import { CONQUEST_PATH } from '../constant';

// Conquer the world by answering questions about it. The map reads signed out too, so a guest
// sees who holds what before deciding to join.
//
// A round is 7 days, open one day and shut the next (days 1, 3, 5, 7); its winners stand once it
// ends (closesAt). openUntil is set while open, nextOpenAt while shut.
//
// { round, open, opensAt, closesAt, nextRoundAt, openUntil, nextOpenAt, countries: [{ categoryId, code, name, open,
//   heldBy: { id, displayName } | null, rightAnswers, totalAnswers, spentTime,
//   attemptAllowed, attemptBlockedReason }] }
// `code` is the ISO3 the map already knows its country shapes by.
export const getConquestState = () => request(CONQUEST_PATH);

// Enters a finished quiz run as a go at this country. The run carries its own score and time,
// so there is nothing here for the browser to claim. Resolves to the map as it stands after.
export const enterConquestAttempt = (countryId: number, historyId: number) =>
  request(`${CONQUEST_PATH}/${countryId}/attempt`, {
    body: { historyId },
    method: POST,
  });

// Plays Conquest for one of the reader's chat groups (a country they hold counts for it), or on
// their own again with null. Resolves to the map as it stands after.
export const setConquestTeam = (groupId: number | null) =>
  request(`${CONQUEST_PATH}/team`, { body: { groupId }, method: PUT });
