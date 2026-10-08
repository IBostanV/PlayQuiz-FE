import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faImage, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import { FEEDBACK_CHANGED, getFeedback, getFeedbackScreenshot, setFeedbackResolved } from '../../../api/feedback';
import { Popup } from '../../../components/common/popup';
import { formatDate } from '../../../utils/toDate';

const TYPE_LABELS = {
  BUG: ['admin_feedback_type_bug', 'Bug'],
  QUESTION: ['admin_feedback_type_question', 'Question'],
  SUGGESTION: ['admin_feedback_type_suggestion', 'Suggestion'],
  OTHER: ['admin_feedback_type_other', 'Other'],
};

const sentAt = (value) => formatDate(value, undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Messages players sent from the footer: open ones first, newest first. Resolving one takes it
// off the navbar badge's count; reopening puts it back.
export default function FeedbackAdmin() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [busyId, setBusyId] = useState(null);
  // The screenshot on show, fetched only when asked for: the list carries none of them.
  const [screenshot, setScreenshot] = useState(null);

  const showScreenshot = (entry) => {
    setBusyId(entry.id);
    getFeedbackScreenshot(entry.id)
      .then(picture => picture && setScreenshot(URL.createObjectURL(picture)))
      .finally(() => setBusyId(null));
  };

  const closeScreenshot = () => {
    if (screenshot) URL.revokeObjectURL(screenshot);
    setScreenshot(null);
  };

  useEffect(() => {
    getFeedback().then(list => setEntries(list ?? []));
  }, []);

  const toggle = (entry) => {
    setBusyId(entry.id);
    setFeedbackResolved(entry.id, !entry.resolved)
      .then(updated => {
        if (!updated) return;
        setEntries(list => list.map(item => item.id === updated.id ? updated : item));
        window.dispatchEvent(new Event(FEEDBACK_CHANGED));
      })
      .finally(() => setBusyId(null));
  };

  const open = entries.filter(entry => !entry.resolved).length;

  return (
    <div className="shadowed">
      <h4 className="text-center">{t('admin_feedback', 'Feedback')}</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {open ? t('admin_count_open', '{{count}} open', { count: open }) : t('admin_nothing_open', 'Nothing open')}
        {' · '}{t('admin_in_total', '{{count}} in total', { count: entries.length })}
      </p>
      <Table responsive striped bordered variant="dark" className="admin-feedback-table">
        <thead>
        <tr>
          <th>{t('admin_col_type', 'Type')}</th>
          <th>{t('admin_col_message', 'Message')}</th>
          <th className="text-center">{t('admin_screenshot', 'Screenshot')}</th>
          <th>{t('admin_col_from', 'From')}</th>
          <th>{t('admin_col_page', 'Page')}</th>
          <th>{t('admin_col_sent', 'Sent')}</th>
          <th className="text-center"><span className="visually-hidden">{t('admin_col_status', 'Status')}</span></th>
        </tr>
        </thead>
        <tbody>
        {entries.map(entry => (
          <tr key={entry.id} data-resolved={entry.resolved}>
            <td><span className="admin-feedback-type" data-type={entry.type}>{TYPE_LABELS[entry.type] ? t(...TYPE_LABELS[entry.type]) : entry.type}</span></td>
            <td className="admin-feedback-message">
              {entry.message}
              {/* Reported from inside a quiz: which question. */}
              {entry.question && <div className="admin-feedback-question">{entry.question}</div>}
            </td>
            <td className="text-center">
              {entry.hasScreenshot ? (
                <button type="button" className="admin-feedback-screenshot" onClick={() => showScreenshot(entry)}
                        disabled={busyId === entry.id} aria-haspopup="dialog">
                  <FontAwesomeIcon icon={faImage}/>
                  <span>{t('admin_screenshot', 'Screenshot')}</span>
                </button>
              ) : '—'}
            </td>
            <td>
              {entry.from?.displayName ?? <span className="admin-feedback-guest">{t('admin_guest', 'Guest')}</span>}
              {entry.contactEmail && (
                <div><a href={`mailto:${entry.contactEmail}`}>{entry.contactEmail}</a></div>
              )}
            </td>
            <td>{entry.page ? <Link href={entry.page}>{entry.page}</Link> : '—'}</td>
            <td className="text-nowrap">{sentAt(entry.sentAt)}</td>
            <td className="text-center">
              <button type="button" className="admin-feedback-toggle" onClick={() => toggle(entry)}
                      disabled={busyId === entry.id}>
                <FontAwesomeIcon icon={entry.resolved ? faRotateLeft : faCheck}/>
                <span>{entry.resolved ? t('admin_reopen', 'Reopen') : t('admin_resolve', 'Resolve')}</span>
              </button>
            </td>
          </tr>
        ))}
        {!entries.length && (
          <tr>
            <td colSpan={7} className="text-center">{t('admin_no_feedback', 'No feedback yet.')}</td>
          </tr>
        )}
        </tbody>
      </Table>

      <Popup open={Boolean(screenshot)} icon={faImage} title={t('admin_screenshot', 'Screenshot')} onClose={closeScreenshot}>
        <img className="admin-feedback-screenshot-full" src={screenshot} alt={t('admin_screenshot_alt', 'The screenshot sent with this message')}/>
        <div className="popup-actions">
          <button type="button" className="popup-cancel" onClick={closeScreenshot}>{t('close', 'Close')}</button>
        </div>
      </Popup>
    </div>
  );
}
