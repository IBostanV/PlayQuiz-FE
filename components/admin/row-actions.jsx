import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrashCan } from '@fortawesome/free-solid-svg-icons';

// Edit / delete buttons for the last cell of an admin table row. Clicks stop here, so a row
// that is itself clickable (glossaries) does not also react. `name` makes the labels specific:
// "Edit Geography" reads better to a screen reader than twenty identical "Edit" buttons.
export const RowActions = ({ name, onEdit, onDelete, busy = false }) => (
  <td className="text-center admin-row-actions" onClick={(event) => event.stopPropagation()}>
    {onEdit && (
      <button type="button" className="friends-action" onClick={onEdit} disabled={busy}
              aria-haspopup="dialog" aria-label={`Edit ${name}`} data-tooltip="Edit">
        <FontAwesomeIcon icon={faPen}/>
      </button>
    )}
    {onDelete && (
      <button type="button" className="friends-action friends-action-danger" onClick={onDelete} disabled={busy}
              aria-haspopup="dialog" aria-label={`Delete ${name}`} data-tooltip="Delete">
        <FontAwesomeIcon icon={faTrashCan}/>
      </button>
    )}
  </td>
);

RowActions.propTypes = {
  name: PropTypes.string,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  busy: PropTypes.bool,
};
