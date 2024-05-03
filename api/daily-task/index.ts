import request from '../../utils/request';
import { DAILY_TASK_PATH } from '../constant';

// Today's goals for the signed-in player. Reading them is what pays the finished ones, so a task
// that comes back with `awarded` was just paid and the navbar's level bar is a read behind.
//
// [{ code, progress, target, experience, completed, awarded }]
export const getDailyTasks = () => request(DAILY_TASK_PATH);
