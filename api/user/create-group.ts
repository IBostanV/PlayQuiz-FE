import request, {POST} from '../../utils/request';
import {USER_PATH} from '../constant';

// Resolves to the new group's id; the current user is added as a participant server-side.
const createGroup = (name: string, participantIds: number[]) => request(`${USER_PATH}/groups`, {
    body: {name, participantIds},
    method: POST,
});

export default createGroup;
