import React, { useEffect, useState } from 'react';
import { Tab } from 'react-bootstrap';
import { faEnvelope, faUsersGear, faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';
import FeedbackAdmin from './feedback/component';
import CustomQuizzesAdmin from './custom-quizzes/component';
import UsersAdmin from './users/component';
import { AdminDashboard } from '../../components/admin/dashboard';
import { FEEDBACK_CHANGED, getOpenFeedbackCount } from '../../api/feedback';

// The admin dashboard: what players send in (the quizzes they wrote, the messages they left) and
// the accounts themselves. Admins only — the content dashboard at /content holds the quiz content,
// which the content roles reach as well.
const AdminDashboardPage = () => {
  // How many messages are still open, beside the Feedback entry. The Feedback tab fires
  // FEEDBACK_CHANGED when one is resolved or reopened, so the count follows without a reload.
  const [openFeedback, setOpenFeedback] = useState(0);
  useEffect(() => {
    const recount = () => getOpenFeedbackCount().then(count => setOpenFeedback(count ?? 0));
    recount();
    window.addEventListener(FEEDBACK_CHANGED, recount);
    return () => window.removeEventListener(FEEDBACK_CHANGED, recount);
  }, []);

  const sections = [
    { key: 'custom-quizzes', label: 'Custom quizzes', icon: faWandMagicSparkles },
    { key: 'feedback', label: 'Feedback', icon: faEnvelope, badge: openFeedback },
    { key: 'users', label: 'Users', icon: faUsersGear },
  ];

  return (
    <AdminDashboard title="Admin dashboard" sections={sections}>
      <Tab.Pane eventKey="custom-quizzes">
        <CustomQuizzesAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="feedback">
        <FeedbackAdmin/>
      </Tab.Pane>
      <Tab.Pane eventKey="users">
        <UsersAdmin/>
      </Tab.Pane>
    </AdminDashboard>
  );
};

export default AdminDashboardPage;
