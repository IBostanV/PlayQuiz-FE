import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Table } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { deleteCustomQuiz, getAllCustomQuizzes } from '../../../api/quiz';
import { ConfirmDialog } from '../../../components/common/popup';
import { RowActions } from '../../../components/admin/row-actions';
import {formatDate} from '../../../utils/toDate';

const label = (name) => {
  const words = name?.replace(/_/g, ' ').toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '—';
};

const madeOn = (value) => formatDate(value, undefined, { dateStyle: 'medium' });

// Every quiz players built from their own questions, newest first. Opening one shows it as its
// players see it, which is how the questions get moderated.
export default function CustomQuizzesAdmin() {
  const { t } = useTranslation();
  const madeBy = (quiz) => quiz.createdBy?.displayName ?? t('admin_a_player', 'a player');
  const [quizzes, setQuizzes] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getAllCustomQuizzes().then(list => setQuizzes(list ?? []));
  }, []);

  // The trash icon only opens the confirm; its button does the deleting.
  const confirmDelete = () => {
    const quiz = pendingDelete;
    setDeleting(true);
    deleteCustomQuiz(quiz.quizId)
      .then(response => {
        if (!response) return;
        setQuizzes(list => list.filter(item => item.quizId !== quiz.quizId));
      })
      .finally(() => {
        setDeleting(false);
        setPendingDelete(null);
      });
  };

  return (
    <div className="shadowed">
      <h4 className="text-center">{t('admin_custom_quizzes', 'Custom quizzes')}</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {quizzes.length === 1
          ? t('admin_quizzes_made_one', '{{count}} quiz made by players', { count: quizzes.length })
          : t('admin_quizzes_made', '{{count}} quizzes made by players', { count: quizzes.length })}
      </p>
      <Table responsive striped bordered variant="dark">
        <thead>
        <tr>
          <th>{t('admin_col_made_by', 'Made by')}</th>
          <th>{t('admin_col_type', 'Type')}</th>
          <th className="text-center">{t('admin_col_questions', 'Questions')}</th>
          <th className="text-center">{t('admin_col_seconds_each', 'Seconds each')}</th>
          <th className="text-center">{t('admin_col_invited', 'Invited')}</th>
          <th className="text-center">{t('played', 'Played')}</th>
          <th>{t('admin_col_made', 'Made')}</th>
          <th className="text-center"><span className="visually-hidden">{t('admin_open', 'Open')}</span></th>
          <th className="text-center"><span className="visually-hidden">{t('admin_col_actions', 'Actions')}</span></th>
        </tr>
        </thead>
        <tbody>
        {quizzes.map(quiz => (
          <tr key={quiz.quizId}>
            <td>{quiz.createdBy?.displayName ?? '—'}</td>
            <td>{label(quiz.quizType)}</td>
            <td className="text-center">{quiz.questionsCount}</td>
            <td className="text-center">{quiz.questionTime ?? '—'}</td>
            <td className="text-center">{quiz.invited}</td>
            <td className="text-center">{quiz.played}</td>
            <td className="text-nowrap">{madeOn(quiz.createdAt)}</td>
            <td className="text-center">
              <Link href={`/quiz/custom/${quiz.quizId}`} className="admin-feedback-toggle">
                <FontAwesomeIcon icon={faUpRightFromSquare}/>
                <span>{t('admin_open', 'Open')}</span>
              </Link>
            </td>
            <RowActions name={t('admin_this_quiz_by', 'this quiz by {{name}}', { name: madeBy(quiz), interpolation: { escapeValue: false } })}
                        onDelete={() => setPendingDelete(quiz)}
                        busy={deleting && pendingDelete?.quizId === quiz.quizId}/>
          </tr>
        ))}
        {!quizzes.length && (
          <tr>
            <td colSpan={9} className="text-center">{t('admin_no_custom_quizzes', 'No custom quizzes yet.')}</td>
          </tr>
        )}
        </tbody>
      </Table>

      <ConfirmDialog open={Boolean(pendingDelete)}
                     danger
                     busy={deleting}
                     title={t('admin_delete_quiz_title', 'Delete this quiz?')}
                     message={pendingDelete && t('admin_delete_quiz_message',
                       'The quiz by {{name}} will be deleted, with its questions, its invitations and everyone’s results for it. This can’t be undone.',
                       { name: madeBy(pendingDelete), interpolation: { escapeValue: false } })}
                     confirmLabel={t('delete', 'Delete')}
                     onConfirm={confirmDelete}
                     onCancel={() => setPendingDelete(null)}/>
    </div>
  );
}
