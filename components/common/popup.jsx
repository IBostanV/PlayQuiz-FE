import React, {useEffect, useId, useRef} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCircleQuestion, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons';

// Popup shell on the native <dialog>: showModal() brings focus trapping, Esc to close and an
// inert page behind it, so none of that is re-implemented here.
//
// Anything that opens its own overlay inside (dropdowns, pickers) must render it inside the
// dialog (PrimeReact: appendTo='self'): the modal makes the rest of the page, body-level
// overlays included, inert.
export const Popup = ({open, icon, title, danger, busy, initialFocus, onClose, children}) => {
    const dialogRef = useRef(null);
    const titleId = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        if (open && !dialog.open) {
            dialog.showModal();
            // showModal() focuses the first focusable element; initialFocus picks another.
            // (React's autoFocus runs at mount, while the dialog is still closed.)
            if (initialFocus) dialog.querySelector(initialFocus)?.focus();
        }
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog ref={dialogRef}
                className='popup'
                data-danger={Boolean(danger)}
                aria-labelledby={titleId}
                // Esc fires "cancel"; hand it to the parent so its state stays the source of truth.
                onCancel={(event) => {
                    event.preventDefault();
                    if (!busy) onClose();
                }}
                // A click that lands on the <dialog> itself, not its content, is on the backdrop.
                onClick={(event) => {
                    if (event.target === dialogRef.current && !busy) onClose();
                }}>
            {/* Children mount only while open, so a form inside starts fresh every time. */}
            {open && (
                <div className='popup-content'>
                    {icon && <div className='popup-icon' aria-hidden><FontAwesomeIcon icon={icon}/></div>}
                    <h2 id={titleId} className='popup-title'>{title}</h2>
                    {children}
                </div>
            )}
        </dialog>
    );
};

// Yes/no question. `danger` turns it red and opens on Cancel, so a stray Enter cannot delete.
export const ConfirmDialog = ({open, title, message, confirmLabel, cancelLabel, danger, busy, onConfirm, onCancel}) => {
    const {t} = useTranslation();

    return (
        <Popup open={open}
               icon={danger ? faTriangleExclamation : faCircleQuestion}
               title={title}
               danger={danger}
               busy={busy}
               initialFocus={danger ? '.popup-cancel' : '.popup-confirm'}
               onClose={onCancel}>
            <p className='popup-message'>{message}</p>
            <div className='popup-actions'>
                <button type='button' className='popup-cancel' onClick={onCancel} disabled={busy}>
                    {cancelLabel ?? t('cancel', 'Cancel')}
                </button>
                <button type='button' className='popup-confirm' onClick={onConfirm} disabled={busy}>
                    {busy && <span className='auth-spinner' aria-hidden/>}
                    {confirmLabel ?? t('confirm', 'Confirm')}
                </button>
            </div>
        </Popup>
    );
};

Popup.propTypes = {
    open: PropTypes.bool,
    icon: PropTypes.object,
    title: PropTypes.node,
    danger: PropTypes.bool,
    busy: PropTypes.bool,
    initialFocus: PropTypes.string,
    onClose: PropTypes.func,
    children: PropTypes.node,
};

ConfirmDialog.propTypes = {
    open: PropTypes.bool,
    title: PropTypes.node,
    message: PropTypes.node,
    confirmLabel: PropTypes.node,
    cancelLabel: PropTypes.node,
    danger: PropTypes.bool,
    busy: PropTypes.bool,
    onConfirm: PropTypes.func,
    onCancel: PropTypes.func,
};
