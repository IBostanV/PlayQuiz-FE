import request, { DELETE, PATCH, POST, PUT } from '../../utils/request';
import { USER_PATH } from '../constant';

// Admin-only user management. It sits behind /api/user/admin because the plain GET /api/user any
// signed-in player may call gives out nothing but { id, displayName } — emails and roles are not
// for them. Each call resolves to undefined on failure (the request helper toasts the error).

const ADMIN_USERS_PATH = `${USER_PATH}/admin`;

// The roles an admin grants from the Users tab, one switch each. ROLE_USER is not among them —
// every account has it — and neither is ROLE_MODERATOR, which nothing checks yet: a switch that
// grants nothing is a lie. A role an account already holds that is not listed here is left alone
// by the form, so adding one to the database never silently strips it from anybody.
export const GRANTABLE_ROLES = [
  {
    role: 'ROLE_ADMIN',
    label: 'Administrator',
    hint: 'The admin dashboard: custom quizzes, feedback and these accounts.',
  },
  {
    role: 'ROLE_CONTENT_EDITOR',
    label: 'Content editor',
    hint: 'The content dashboard: categories, glossaries, questions, knowledge base.',
  },
  {
    role: 'ROLE_CONTENT_PUBLISHER',
    label: 'Content publisher',
    hint: 'The content dashboard as well; nothing tells it apart from an editor yet.',
  },
];

export type ManagedUser = {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  blocked: boolean;
  registeredAt: string;
};

type UserBody = { email: string; displayName: string | null; roles: string[] };

// [{ id, email, displayName, roles, blocked, registeredAt }]
export const getManagedUsers = (): Promise<ManagedUser[] | undefined> => request(ADMIN_USERS_PATH);

export const createUser = (body: UserBody & { password: string }) =>
  request(ADMIN_USERS_PATH, { body, method: POST });

// Display name and roles. The email and password are the user's own: the server keeps them as they are.
export const updateUser = (userId: number, body: UserBody) =>
  request(`${ADMIN_USERS_PATH}/${userId}`, { body, method: PUT });

// A blocked user keeps their account, quizzes and history; they just cannot sign in.
export const setUserBlocked = (userId: number, blocked: boolean) =>
  request(`${ADMIN_USERS_PATH}/${userId}`, { body: { blocked }, method: PATCH });

export const deleteUser = (userId: number) =>
  request(`${ADMIN_USERS_PATH}/${userId}`, { method: DELETE, withHeaders: true });
