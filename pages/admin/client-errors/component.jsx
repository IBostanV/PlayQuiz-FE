import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Table } from 'react-bootstrap';
import { clearClientErrors, deleteClientError, getClientErrors } from '../../../api/client-error';
import { ConfirmDialog } from '../../../components/common/popup';
import { RowActions } from '../../../components/admin/row-actions';
import { formatDate } from '../../../utils/toDate';

const sentAt = (value) => formatDate(value, undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Errors players' browsers hit, newest first. Deleting one takes it off the list; Clear all
// empties the table. `onChange` lets the dashboard recount its badge.
export default function ClientErrorsAdmin({ total, onChange }) {
  const { t } = useTranslation();
  const [errors, setErrors] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getClientErrors().then(list => setErrors(list ?? []));
  }, []);

  const remove = (error) => {
    setBusyId(error.id);
    deleteClientError(error.id)
      .then(response => {
        if (!response) return;
        setErrors(list => list.filter(item => item.id !== error.id));
        onChange();
      })
      .finally(() => setBusyId(null));
  };

  const clearAll = () => {
    setClearing(true);
    clearClientErrors()
      .then(response => {
        if (!response) return;
        setErrors([]);
        onChange();
      })
      .finally(() => {
        setClearing(false);
        setConfirmingClear(false);
      });
  };

  return (
    <div className="shadowed">
      <h4 className="text-center">{t('admin_errors', 'Errors')}</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {t('admin_in_total', '{{count}} in total', { count: total })}
        {total > errors.length && ` · ${t('admin_errors_newest_shown', 'the newest {{count}} shown', { count: errors.length })}`}
        {total > 0 && (
          <button type="button" className="admin-feedback-toggle ms-3" onClick={() => setConfirmingClear(true)}
                  aria-haspopup="dialog">
            {t('admin_clear_all', 'Clear all')}
          </button>
        )}
      </p>
      <Table responsive striped bordered variant="dark" className="admin-feedback-table">
        <thead>
        <tr>
          <th>{t('admin_col_kind', 'Kind')}</th>
          <th>{t('admin_col_message', 'Message')}</th>
          <th>{t('admin_col_from', 'From')}</th>
          <th>{t('admin_col_page', 'Page')}</th>
          <th>{t('admin_col_sent', 'Sent')}</th>
          <th className="text-center"><span className="visually-hidden">{t('admin_col_actions', 'Actions')}</span></th>
        </tr>
        </thead>
        <tbody>
        {errors.map(error => (
          <tr key={error.id}>
            <td className="text-nowrap">{error.kind}</td>
            <td className="admin-feedback-message">
              {error.message}
              {(error.stack || error.userAgent) && (
                <details className="admin-error-details">
                  <summary>{t('admin_error_details', 'Details')}</summary>
                  {error.userAgent && <div className="admin-feedback-question">{error.userAgent}</div>}
                  {error.stack && <pre>{error.stack}</pre>}
                </details>
              )}
            </td>
            <td>{error.from?.displayName ?? <span className="admin-feedback-guest">{t('admin_guest', 'Guest')}</span>}</td>
            <td>{error.page ? <Link href={error.page}>{error.page}</Link> : '—'}</td>
            <td className="text-nowrap">{sentAt(error.sentAt)}</td>
            <RowActions name={t('admin_this_error', 'this error')} onDelete={() => remove(error)} busy={busyId === error.id}/>
          </tr>
        ))}
        {!errors.length && (
          <tr>
            <td colSpan={6} className="text-center">{t('admin_no_errors', 'No errors reported.')}</td>
          </tr>
        )}
        </tbody>
      </Table>

      <ConfirmDialog open={confirmingClear}
                     danger
                     busy={clearing}
                     title={t('admin_clear_errors_title', 'Clear all errors?')}
                     message={t('admin_clear_errors_message', "All {{count}} stored errors will be deleted. This can't be undone.", { count: total })}
                     confirmLabel={t('admin_clear_all', 'Clear all')}
                     onConfirm={clearAll}
                     onCancel={() => setConfirmingClear(false)}/>
    </div>
  );
}

ClientErrorsAdmin.propTypes = {
  total: PropTypes.number,
  onChange: PropTypes.func,
};
