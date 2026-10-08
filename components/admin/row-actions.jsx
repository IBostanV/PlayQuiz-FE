import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';

// Edit / delete buttons for the last cell of an admin table row. Clicks stop here, so a row
// that is itself clickable (glossaries) does not also react. `name` makes the labels specific:
// "Edit Geography" reads better to a screen reader than twenty identical "Edit" buttons.
export const RowActions = ({ name, onEdit, onDelete, busy = false }) => {
  const { t } = useTranslation();
  return (
    <td className="text-center admin-row-actions" onClick={(event) => event.stopPropagation()}>
      {onEdit && (
        <button type="button" className="friends-action" onClick={onEdit} disabled={busy}
                aria-haspopup="dialog" aria-label={t('content_edit_name', 'Edit {{name}}', { name, interpolation: { escapeValue: false } })}
                data-tooltip={t('edit', 'Edit')}>
          <FontAwesomeIcon icon={faPen}/>
        </button>
      )}
      {onDelete && (
        <button type="button" className="friends-action friends-action-danger" onClick={onDelete} disabled={busy}
                aria-haspopup="dialog" aria-label={t('content_delete_name', 'Delete {{name}}', { name, interpolation: { escapeValue: false } })}
                data-tooltip={t('delete', 'Delete')}>
          <FontAwesomeIcon icon={faTrashCan}/>
        </button>
      )}
    </td>
  );
};

RowActions.propTypes = {
  name: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  busy: PropTypes.bool,
};
