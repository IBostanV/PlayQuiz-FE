import request, {PUT} from "../../utils/request";
import {USER_PATH} from "../constant";

// Whether express quizzes lean to the player's occupations. Sent as JSON: axios would send a bare
// false without a type the server reads.
export const getOccupationQuizzes = () => request(`${USER_PATH}/occupation-quizzes`);

export const setOccupationQuizzes = (enabled: boolean) => request(`${USER_PATH}/occupation-quizzes`,
    {method: PUT, body: JSON.stringify(enabled), headers: {'Content-Type': 'application/json'}});
