import React, { useEffect, useState } from 'react';
import { Table } from 'react-bootstrap';
import Form from 'react-bootstrap/Form';
import { toast } from 'react-toastify';
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

// What the Role column shows: the granted roles by their switch labels, or "Player" for an
// account that holds nothing beyond the ROLE_USER everyone has. A role the form does not offer
// (ROLE_MODERATOR, say) still shows, by its bare name, rather than hiding under "Player".
const roleNames = (user) => (user.roles ?? [])
  .filter(role => role !== 'ROLE_USER')
  .map(role => GRANTABLE_ROLES.find(grantable => grantable.role === role)?.label ?? role);

const roleSummary = (user) => roleNames(user).join(', ') || 'Player';

const registered = (value) => formatDate(value, undefined, { dateStyle: 'medium' });

// One form for both jobs: creating asks for a password, editing leaves the user's own alone.
const UserForm = ({ user, onCancel, onSaved }) => {
  const [email, setEmail] = useState(user?.email ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [password, setPassword] = useState('');
  // Starts from what the account holds, so a role the switches below do not offer rides along
  // untouched instead of being dropped on the first save.
  const [roles, setRoles] = useState(user?.roles?.length ? user.roles : ['ROLE_USER']);
  const [saving, setSaving] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [touched, setTouched] = useState(false);

  const emailError = !email.trim() && 'Give an email address';
  // Only on a new account: an existing one keeps the password its owner chose.
  const passwordError = !user && password.length < 8 && 'At least 8 characters';

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
        toast.success(user ? 'User updated' : 'User created');
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
      <Field label="Email" htmlFor="user-email" error={touched && emailError}
             hint={user && "The owner's sign-in name; it cannot be changed here."}>
        <Form.Control id="user-email" type="email" value={email} isInvalid={Boolean(touched && emailError)}
                      disabled={Boolean(user)}
                      autoComplete="off" onChange={(event) => setEmail(event.target.value)}/>
      </Field>
      <Field label="Display name" htmlFor="user-display-name"
             hint="What other players see. Left empty, the account is known by its email.">
        <Form.Control id="user-display-name" value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}/>
      </Field>
      {!user && (
        <Field label="Password" htmlFor="user-password" error={touched && passwordError}
               hint="The first password for the account; its owner can change it afterwards.">
          <Form.Control id="user-password" type="password" value={password}
                        isInvalid={Boolean(touched && passwordError)} autoComplete="new-password"
                        onChange={(event) => setPassword(event.target.value)}/>
        </Field>
      )}
      <Field label="Access" hint="Every account can play; these open the dashboards on top of that.">
        {GRANTABLE_ROLES.map(({ role, label, hint }) => (
          <Form.Switch key={role} id={`user-role-${role}`} className="admin-switch"
                       label={<>{label}<span className="admin-field-hint d-block">{hint}</span></>}
                       checked={roles.includes(role)}
                       onChange={(event) => toggleRole(role, event.target.checked)}/>
        ))}
      </Field>
      <div className="popup-actions">
        <button type="button" className="popup-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <SaveButton saving={saving} className="popup-confirm">
          {user ? 'Save changes' : 'Create user'}
        </SaveButton>
      </div>
    </Form>
  );
};

// The accounts on the site: add one, edit it, grant or take away admin, block someone from
// signing in, or delete the account outright.
export default function UsersAdmin() {
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

  const search = useSearch(users, ['email', 'displayName', roleSummary]);
  const sort = useSort(search.results, {
    email: 'email',
    name: 'displayName',
    role: roleSummary,
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
        toast.success('User deleted');
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
      <h4 className="text-center">Users</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {users.length} {users.length === 1 ? 'account' : 'accounts'} · {admins} admin · {blocked} blocked
      </p>
      <div className="admin-form-actions">
        <SaveButton icon={faUserPlus} saving={false} type="button" onClick={() => setEditing('new')}>
          Add user
        </SaveButton>
      </div>
      <TableSearch value={search.query} onChange={search.setQuery}
                   placeholder="Search by email, name or role…" count={search.results.length}
                   label="Search users"/>
      {/* The feedback table's styling: rows that are out of play (blocked here) step back. */}
      <Table striped bordered variant="dark" className="admin-feedback-table">
        <thead>
        <tr>
          <SortHeader column="email" sort={sort.sort} onSort={sort.toggle}>Email</SortHeader>
          <SortHeader column="name" sort={sort.sort} onSort={sort.toggle}>Display name</SortHeader>
          <SortHeader column="role" sort={sort.sort} onSort={sort.toggle}>Role</SortHeader>
          <SortHeader column="registered" sort={sort.sort} onSort={sort.toggle}>Registered</SortHeader>
          <SortHeader column="status" sort={sort.sort} onSort={sort.toggle} className="text-center">Access</SortHeader>
          <th className="text-center"><span className="visually-hidden">Actions</span></th>
        </tr>
        </thead>
        <tbody>
        {pages.pageItems.map(user => (
          <tr key={user.id} data-resolved={user.blocked}>
            <td>{user.email}</td>
            <td>{user.displayName || '—'}</td>
            <td>{roleSummary(user)}</td>
            <td className="text-nowrap">{registered(user.registeredAt)}</td>
            <td className="text-center">
              {user.id === currentUserId ? 'You' : (
                <button type="button" className="admin-feedback-toggle" onClick={() => toggleBlocked(user)}
                        disabled={busyId === user.id}>
                  <FontAwesomeIcon icon={user.blocked ? faCircleCheck : faBan}/>
                  <span>{user.blocked ? 'Unblock' : 'Block'}</span>
                </button>
              )}
            </td>
            <RowActions name={user.displayName || user.email}
                        onEdit={() => setEditing(user)}
                        onDelete={user.id === currentUserId ? undefined : () => setPendingDelete(user)}
                        busy={deleting && pendingDelete?.id === user.id}/>
          </tr>
        ))}
        <EmptyRow show={!search.results.length} columns={6} query={search.query} what="users"/>
        </tbody>
      </Table>
      <Pagination {...pages} onChange={pages.setPage} label="Users pages"/>

      <ConfirmDialog open={Boolean(pendingDelete)}
                     danger
                     busy={deleting}
                     title="Delete user?"
                     message={pendingDelete && <>
                       <strong>{pendingDelete.displayName || pendingDelete.email}</strong> and everything tied to the
                       account will be permanently deleted. This can’t be undone — block the account instead to only
                       keep them out.
                     </>}
                     confirmLabel="Delete"
                     onConfirm={confirmDelete}
                     onCancel={() => setPendingDelete(null)}/>

      <Popup open={Boolean(editing)} icon={editing === 'new' ? faUserPlus : faPen}
             title={editing === 'new' ? 'New user' : 'Edit user'} onClose={() => setEditing(null)}>
        {editing && (
          <UserForm user={editing === 'new' ? null : editing}
                    onCancel={() => setEditing(null)}
                    onSaved={saved}/>
        )}
      </Popup>
    </div>
  );
}
