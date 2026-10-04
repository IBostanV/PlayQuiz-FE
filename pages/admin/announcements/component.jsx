import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { deleteAnnouncement, getAnnouncements, sendAnnouncement } from '../../../api/announcement';
import { Field, SaveButton } from '../../../components/admin/form-kit';
import { ConfirmDialog } from '../../../components/common/popup';
import { formatDate } from '../../../utils/toDate';

const sentAt = (value) => formatDate(value, undefined, { dateStyle: 'medium', timeStyle: 'short' });

// Tell every player something. It pops up once on their screen (after the quiz, if they are in
// one) and stays offered for 30 days to those who have not been on since. Deleting one stops it
// reaching anyone who has not seen it yet.
export default function AnnouncementsAdmin() {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState([]);
  const [toDelete, setToDelete] = useState(null);

  const reload = () => getAnnouncements().then(found => setSent(found ?? []));
  useEffect(() => {
    reload();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSending(true);
    try {
      if (await sendAnnouncement(title.trim(), content.trim())) {
        toast.success(t('admin_announcement_sent', 'Announcement sent'));
        setTitle('');
        setContent('');
        reload();
      }
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = () => deleteAnnouncement(toDelete.announcementId).then(() => {
    setToDelete(null);
    reload();
  });

  return (
    <>
      <Form className="shadowed admin-form" onSubmit={submit} noValidate>
        <h4 className="text-center">{t('admin_announcements', 'Announcements')}</h4>
        <hr/>
        <p className="admin-field-hint">
          {t('admin_announcements_intro', 'Shown once to every player, over whatever page they are on. Someone in the middle of a quiz sees it when the quiz is over.')}
        </p>
        <Field label={t('title', 'Title')} htmlFor="announcement-title">
          <Form.Control id="announcement-title" value={title} maxLength={200} required
                        onChange={(event) => setTitle(event.target.value)}/>
        </Field>
        <Field label={t('message', 'Message')} htmlFor="announcement-content" wide>
          <Form.Control id="announcement-content" as="textarea" rows={4} value={content} maxLength={4000}
                        onChange={(event) => setContent(event.target.value)}/>
        </Field>
        <div className="admin-form-actions">
          <SaveButton saving={sending} icon={faPaperPlane} disabled={sending || !title.trim()}>
            {t('admin_send_announcement', 'Send to everyone')}
          </SaveButton>
        </div>
      </Form>

      <div className="shadowed mt-3">
        <Table responsive striped bordered variant="dark">
          <thead>
          <tr>
            <th>{t('title', 'Title')}</th>
            <th>{t('message', 'Message')}</th>
            <th>{t('admin_col_sent', 'Sent')}</th>
            <th><span className="visually-hidden">{t('delete', 'Delete')}</span></th>
          </tr>
          </thead>
          <tbody>
          {sent.map(entry => (
            <tr key={entry.announcementId}>
              <td>{entry.title}</td>
              <td className="announcement-text">{entry.content}</td>
              <td className="text-nowrap">{sentAt(entry.createdDate)}</td>
              <td className="text-center">
                <button type="button" className="friends-action friends-action-danger"
                        aria-label={t('delete', 'Delete')} data-tooltip={t('delete', 'Delete')}
                        onClick={() => setToDelete(entry)}>
                  <FontAwesomeIcon icon={faTrashCan}/>
                </button>
              </td>
            </tr>
          ))}
          {!sent.length && (
            <tr>
              <td colSpan={4} className="text-center">{t('admin_no_announcements', 'No announcements yet.')}</td>
            </tr>
          )}
          </tbody>
        </Table>
      </div>

      <ConfirmDialog open={Boolean(toDelete)} danger
                     title={t('admin_delete_announcement', 'Delete this announcement?')}
                     message={t('admin_delete_announcement_text', 'Players who have not seen it yet will not get it.')}
                     confirmLabel={t('delete', 'Delete')}
                     onConfirm={confirmDelete} onCancel={() => setToDelete(null)}/>
    </>
  );
}
