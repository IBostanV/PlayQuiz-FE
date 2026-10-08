import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCircleCheck, faPen, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import {
  createUser,
  deleteUser,
  getManagedUsers,
  GRANTABLE_ROLES,
  setUserBlocked,
  updateUser,
} from '../../../api/user/admin';
import { ConfirmDialog, Popup } from '../../../components/common/popup';
import { RowActions } from '../../../components/admin/row-actions';
import { Field, SaveButton } from '../../../components/admin/form-kit';
import { Pagination, PAGE_SIZE, usePagination } from '../../../components/admin/pagination';
import { EmptyRow, TableSearch, useSearch } from '../../../components/admin/search';
import { SortHeader, useSort } from '../../../components/admin/sort';
import { formatDate } from '../../../utils/toDate';

const isAdmin = (user) => Boolean(user.roles?.includes('ROLE_ADMIN'));

// The switch labels and hints of GRANTABLE_ROLES, as translation keys with their English.
const ROLE_TEXT = {
  ROLE_ADMIN: {
    label: ['admin_role_admin', 'Administrator'],
    hint: ['admin_role_admin_hint', 'The admin dashboard: custom quizzes, feedback and these accounts.'],
  },
  ROLE_CONTENT_EDITOR: {
    label: ['admin_role_content_editor', 'Content editor'],
    hint: ['admin_role_content_editor_hint', 'The content dashboard: categories, glossaries, questions, knowledge base.'],
  },
  ROLE_CONTENT_PUBLISHER: {
    label: ['admin_role_content_publisher', 'Content publisher'],
    hint: ['admin_role_content_publisher_hint', 'The content dashboard as well; nothing tells it apart from an editor yet.'],
  },
};

// What the Role column shows: the granted roles by their switch labels, or "Player" for an
// account that holds nothing beyond the ROLE_USER everyone has. A role the form does not offer
// (ROLE_MODERATOR, say) still shows, by its bare name, rather than hiding under "Player".
const roleNames = (user, t) => (user.roles ?? [])
  .filter(role => role !== 'ROLE_USER')
  .map(role => ROLE_TEXT[role] ? t(...ROLE_TEXT[role].label)
    : GRANTABLE_ROLES.find(grantable => grantable.role === role)?.label ?? role);

const roleSummary = (user, t) => roleNames(user, t).join(', ') || t('admin_role_player', 'Player');

const registered = (value) => formatDate(value, undefined, { dateStyle: 'medium' });

// One form for both jobs: creating asks for a password, editing leaves the user's own alone.
const UserForm = ({ user, onCancel, onSaved }) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [password, setPassword] = useState('');
  // Starts from what the account holds, so a role the switches below do not offer rides along
  // untouched instead of being dropped on the first save.
  const [roles, setRoles] = useState(user?.roles?.length ? user.roles : ['ROLE_USER']);
  const [saving, setSaving] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [touched, setTouched] = useState(false);

  const emailError = !email.trim() && t('admin_give_email', 'Give an email address');
  // Only on a new account: an existing one keeps the password its owner chose.
  const passwordError = !user && password.length < 8 && t('admin_password_min', 'At least 8 characters');

  const toggleRole = (role, granted) => setRoles(list =>
    granted ? [...list, role] : list.filter(item => item !== role));

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (emailError || passwordError) return;

    setSaving(true);
    try {
      const body = {
        email: email.trim(),
        displayName: displayName.trim() || null,
        roles,
      };
      const saved = user
        ? await updateUser(user.id, body)
        : await createUser({ ...body, password });

      if (saved) {
        toast.success(user ? t('admin_user_updated', 'User updated') : t('admin_user_created', 'User created'));
        onSaved(saved);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form className="admin-form admin-popup-form" onSubmit={submit} noValidate>
      {/* Set once, when the account is made: after that it is the owner's sign-in name, and the
          server ignores any change to it. */}
      <Field label={t('admin_email', 'Email')} htmlFor="user-email" error={touched && emailError}
             hint={user && t('admin_email_hint', "The owner's sign-in name; it cannot be changed here.")}>
        <Form.Control id="user-email" type="email" value={email} isInvalid={Boolean(touched && emailError)}
                      disabled={Boolean(user)}
                      autoComplete="off" onChange={(event) => setEmail(event.target.value)}/>
      </Field>
      <Field label={t('admin_display_name', 'Display name')} htmlFor="user-display-name"
             hint={t('admin_display_name_hint', 'What other players see. Left empty, the account is known by its email.')}>
        <Form.Control id="user-display-name" value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}/>
      </Field>
      {!user && (
        <Field label={t('admin_password', 'Password')} htmlFor="user-password" error={touched && passwordError}
               hint={t('admin_password_hint', 'The first password for the account; its owner can change it afterwards.')}>
          <Form.Control id="user-password" type="password" value={password}
                        isInvalid={Boolean(touched && passwordError)} autoComplete="new-password"
                        onChange={(event) => setPassword(event.target.value)}/>
        </Field>
      )}
      <Field label={t('admin_access', 'Access')}
             hint={t('admin_access_hint', 'Every account can play; these open the dashboards on top of that.')}>
        {GRANTABLE_ROLES.map(({ role, label, hint }) => (
          <Form.Switch key={role} id={`user-role-${role}`} className="admin-switch"
                       label={<>
                         {ROLE_TEXT[role] ? t(...ROLE_TEXT[role].label) : label}
                         <span className="admin-field-hint d-block">{ROLE_TEXT[role] ? t(...ROLE_TEXT[role].hint) : hint}</span>
                       </>}
                       checked={roles.includes(role)}
                       onChange={(event) => toggleRole(role, event.target.checked)}/>
        ))}
      </Field>
      <div className="popup-actions">
        <button type="button" className="popup-cancel" onClick={onCancel} disabled={saving}>{t('cancel', 'Cancel')}</button>
        <SaveButton saving={saving} className="popup-confirm">
          {user ? t('admin_save_changes', 'Save changes') : t('admin_create_user', 'Create user')}
        </SaveButton>
      </div>
    </Form>
  );
};

// The accounts on the site: add one, edit it, grant or take away admin, block someone from
// signing in, or delete the account outright.
export default function UsersAdmin() {
  const { t } = useTranslation();
  const roles = (user) => roleSummary(user, t);
  const [users, setUsers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  // null = closed, 'new' = the create form, a user = editing that one.
  const [editing, setEditing] = useState(null);
  // The trash button only opens the dialog; its confirm does the delete.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getManagedUsers().then(list => setUsers(list ?? []));
  }, []);

  // Nobody gets to block or delete themselves out of the admin pages.
  const currentUserId = typeof window === 'undefined' ? null : Number(localStorage.getItem('userId'));

  const search = useSearch(users, ['email', 'displayName', roles]);
  const sort = useSort(search.results, {
    email: 'email',
    name: 'displayName',
    role: roles,
    status: 'blocked',
    registered: 'registeredAt',
  });
  const pages = usePagination(sort.sorted, PAGE_SIZE,
    `${search.query}|${sort.sort.key}|${sort.sort.direction}`);

  const toggleBlocked = (user) => {
    setBusyId(user.id);
    setUserBlocked(user.id, !user.blocked)
      .then(updated => updated && setUsers(list => list.map(item => item.id === updated.id ? updated : item)))
      .finally(() => setBusyId(null));
  };

  const confirmDelete = () => {
    const user = pendingDelete;
    setDeleting(true);
    deleteUser(user.id)
      .then(response => {
        if (!response) return;
        setUsers(list => list.filter(item => item.id !== user.id));
        toast.success(t('admin_user_deleted', 'User deleted'));
      })
      .finally(() => {
        setDeleting(false);
        setPendingDelete(null);
      });
  };

  const saved = (user) => {
    setUsers(list => list.some(item => item.id === user.id)
      ? list.map(item => item.id === user.id ? user : item)
      : [...list, user]);
    setEditing(null);
  };

  const admins = users.filter(isAdmin).length;
  const blocked = users.filter(user => user.blocked).length;

  return (
    <div className="shadowed">
      <h4 className="text-center">{t('admin_users', 'Users')}</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {users.length === 1
          ? t('admin_accounts_one', '{{count}} account', { count: users.length })
          : t('admin_accounts', '{{count}} accounts', { count: users.length })}
        {' · '}{t('admin_admins_count', '{{count}} admin', { count: admins })}
        {' · '}{t('admin_blocked_count', '{{count}} blocked', { count: blocked })}
      </p>
      <div className="admin-form-actions">
        <SaveButton icon={faUserPlus} saving={false} type="button" onClick={() => setEditing('new')}>
          {t('admin_add_user', 'Add user')}
        </SaveButton>
      </div>
      <TableSearch value={search.query} onChange={search.setQuery}
                   placeholder={t('admin_search_users_placeholder', 'Search by email, name or role…')} count={search.results.length}
                   label={t('admin_search_users', 'Search users')}/>
      {/* The feedback table's styling: rows that are out of play (blocked here) step back. */}
      <Table responsive striped bordered variant="dark" className="admin-feedback-table">
        <thead>
        <tr>
          <SortHeader column="email" sort={sort.sort} onSort={sort.toggle}>{t('admin_email', 'Email')}</SortHeader>
          <SortHeader column="name" sort={sort.sort} onSort={sort.toggle}>{t('admin_display_name', 'Display name')}</SortHeader>
          <SortHeader column="role" sort={sort.sort} onSort={sort.toggle}>{t('admin_col_role', 'Role')}</SortHeader>
          <SortHeader column="registered" sort={sort.sort} onSort={sort.toggle}>{t('admin_col_registered', 'Registered')}</SortHeader>
          <SortHeader column="status" sort={sort.sort} onSort={sort.toggle} className="text-center">{t('admin_access', 'Access')}</SortHeader>
          <th className="text-center"><span className="visually-hidden">{t('admin_col_actions', 'Actions')}</span></th>
        </tr>
        </thead>
        <tbody>
        {pages.pageItems.map(user => (
          <tr key={user.id} data-resolved={user.blocked}>
            <td>{user.email}</td>
            <td>{user.displayName || '—'}</td>
            <td>{roles(user)}</td>
            <td className="text-nowrap">{registered(user.registeredAt)}</td>
            <td className="text-center">
              {user.id === currentUserId ? t('you', 'You') : (
                <button type="button" className="admin-feedback-toggle" onClick={() => toggleBlocked(user)}
                        disabled={busyId === user.id}>
                  <FontAwesomeIcon icon={user.blocked ? faCircleCheck : faBan}/>
                  <span>{user.blocked ? t('admin_unblock', 'Unblock') : t('admin_block', 'Block')}</span>
                </button>
              )}
            </td>
            <RowActions name={user.displayName || user.email}
                        onEdit={() => setEditing(user)}
                        onDelete={user.id === currentUserId ? undefined : () => setPendingDelete(user)}
                        busy={deleting && pendingDelete?.id === user.id}/>
          </tr>
        ))}
        <EmptyRow show={!search.results.length} columns={6} query={search.query} what={t('admin_users_what', 'users')}/>
        </tbody>
      </Table>
      <Pagination {...pages} onChange={pages.setPage} label={t('admin_users_pages', 'Users pages')}/>

      <ConfirmDialog open={Boolean(pendingDelete)}
                     danger
                     busy={deleting}
                     title={t('admin_delete_user_title', 'Delete user?')}
                     message={pendingDelete && <>
                       <strong>{pendingDelete.displayName || pendingDelete.email}</strong>{' '}
                       {t('admin_delete_user_message', 'and everything tied to the account will be permanently deleted. This can’t be undone — block the account instead to only keep them out.')}
                     </>}
                     confirmLabel={t('delete', 'Delete')}
                     onConfirm={confirmDelete}
                     onCancel={() => setPendingDelete(null)}/>

      <Popup open={Boolean(editing)} icon={editing === 'new' ? faUserPlus : faPen}
             title={editing === 'new' ? t('admin_new_user', 'New user') : t('admin_edit_user', 'Edit user')} onClose={() => setEditing(null)}>
        {editing && (
          <UserForm user={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSaved={saved}/>
        )}
      </Popup>
    </div>
  );
}
