import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tab } from 'react-bootstrap';
import { faBug, faBullhorn, faEnvelope, faHandHoldingHeart, faUsersGear, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import FeedbackAdmin from './feedback/component';
import ClientErrorsAdmin from './client-errors/component';
import { getClientErrorCount } from '../../api/client-error';
import CustomQuizzesAdmin from './custom-quizzes/component';
import UsersAdmin from './users/component';
import DonationsAdmin from './donations/component';
import AnnouncementsAdmin from './announcements/component';
import { AdminDashboard } from '../../components/admin/dashboard';
import { FEEDBACK_CHANGED, getOpenFeedbackCount } from '../../api/feedback';

// The admin dashboard: what players send in (the quizzes they wrote, the messages they left) and
// the accounts themselves. Admins only — the content dashboard at /content holds the quiz content,
// which the content roles reach as well.
const AdminDashboardPage = () => {
  const { t } = useTranslation();
  // How many messages are still open, beside the Feedback entry. The Feedback tab fires
  // FEEDBACK_CHANGED when one is resolved or reopened, so the count follows without a reload.
  const [openFeedback, setOpenFeedback] = useState(0);
  useEffect(() => {
    const recount = () => getOpenFeedbackCount().then(count => setOpenFeedback(count ?? 0));
    recount();
    window.addEventListener(FEEDBACK_CHANGED, recount);
    return () => window.removeEventListener(FEEDBACK_CHANGED, recount);
  }, []);

  // How many browser errors are stored; the Errors tab asks for a recount when it deletes.
  const [errorCount, setErrorCount] = useState(0);
  const recountErrors = () => getClientErrorCount().then(count => setErrorCount(count ?? 0));
  useEffect(() => {
    recountErrors();
  }, []);

  const sections = [
    { key: 'custom-quizzes', label: t('admin_custom_quizzes', 'Custom quizzes'), icon: faWandMagicSparkles },
    { key: 'feedback', label: t('admin_feedback', 'Feedback'), icon: faEnvelope, badge: openFeedback },
    { key: 'errors', label: t('admin_errors', 'Errors'), icon: faBug, badge: errorCount },
    { key: 'announcements', label: t('admin_announcements', 'Announcements'), icon: faBullhorn },
    { key: 'users', label: t('admin_users', 'Users'), icon: faUsersGear },
    { key: 'donations', label: t('admin_donations', 'Donations'), icon: faHandHoldingHeart },
  ];

  return (
    <AdminDashboard title={t('admin_dashboard', 'Admin dashboard')} sections={sections}>
      <Tab.Pane eventKey="custom-quizzes">
        <CustomQuizzesAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="feedback">
        <FeedbackAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="errors">
        <ClientErrorsAdmin total={errorCount} onChange={recountErrors}/>
      </Tab.Pane>
      <Tab.Pane eventKey="announcements">
        <AnnouncementsAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="users">
        <UsersAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="donations">
        <DonationsAdmin/>
      </Tab.Pane>
    </AdminDashboard>
  );
};

export default AdminDashboardPage;
