import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
      <h4 className="text-center">Custom quizzes</h4>
      <hr/>
      <p className="admin-feedback-summary">
        {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'} made by players
      </p>
      <Table striped bordered variant="dark">
        <thead>
        <tr>
          <th>Made by</th>
          <th>Type</th>
          <th className="text-center">Questions</th>
          <th className="text-center">Seconds each</th>
          <th className="text-center">Invited</th>
          <th className="text-center">Played</th>
          <th>Made</th>
          <th className="text-center"><span className="visually-hidden">Open</span></th>
          <th className="text-center"><span className="visually-hidden">Actions</span></th>
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
                <span>Open</span>
              </Link>
            </td>
            <RowActions name={`this quiz by ${quiz.createdBy?.displayName ?? 'a player'}`}
                        onDelete={() => setPendingDelete(quiz)}
                        busy={deleting && pendingDelete?.quizId === quiz.quizId}/>
          </tr>
        ))}
        {!quizzes.length && (
          <tr>
            <td colSpan={9} className="text-center">No custom quizzes yet.</td>
          </tr>
        )}
        </tbody>
      </Table>

      <ConfirmDialog open={Boolean(pendingDelete)}
                     danger
                     busy={deleting}
                     title="Delete this quiz?"
                     message={pendingDelete && <>
                       The quiz by {pendingDelete.createdBy?.displayName ?? 'a player'} will be deleted, with its
                       questions, its invitations and everyone&rsquo;s results for it. This can&rsquo;t be undone.
                     </>}
                     confirmLabel="Delete"
                     onConfirm={confirmDelete}
                     onCancel={() => setPendingDelete(null)}/>
    </div>
  );
}
