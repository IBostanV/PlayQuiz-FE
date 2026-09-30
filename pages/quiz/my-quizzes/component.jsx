import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLink, faPlay, faTrashCan, faWandMagicSparkles} from '@fortawesome/free-solid-svg-icons';
import {deleteCustomQuiz, getMyQuizzes} from '../../../api/quiz';
import {toLabel} from '../../../api/quiz/get-quiz-types';
import {ConfirmDialog} from '../../../components/common/popup';
import {QuizTabs} from '../../../components/quiz/quiz-tabs';
import {formatDate} from '../../../utils/toDate';

// The custom quizzes I made, newest first: how each is played, how many people I invited and how
// many have taken it, with its link to share.
function MyQuizzes({isLoggedIn}) {
    const {t, i18n} = useTranslation();
    const router = useRouter();
    // null until loaded, so the empty message never flashes before the list.
    const [quizzes, setQuizzes] = useState(null);
    // The delete button only opens the dialog; its confirm does the deleting.
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!isLoggedIn) {
            router.replace('/login');
            return;
        }
        getMyQuizzes().then(list => setQuizzes(list ?? []));
    }, [isLoggedIn]);

    const date = (value) => formatDate(value, i18n.language, {day: 'numeric', month: 'short', year: 'numeric'});

    const confirmDelete = () => {
        const quiz = pendingDelete;
        setDeleting(true);
        deleteCustomQuiz(quiz.quizId)
            .then(response => {
                if (!response) return;
                setQuizzes(list => list.filter(item => item.quizId !== quiz.quizId));
                toast.success(t('quiz_deleted', 'Quiz deleted'));
            })
            .finally(() => {
                setDeleting(false);
                setPendingDelete(null);
            });
    };

    // The address invited players open; copied so it can be sent to anyone else invited.
    const copyLink = (quizId) => {
        const link = `${window.location.origin}/quiz/custom/${quizId}`;
        navigator.clipboard?.writeText(link)
            .then(() => toast.success(t('link_copied', 'Link copied')))
            .catch(() => toast.error(t('link_copy_failed', 'Could not copy the link: {{link}}', {link})));
    };

    return (
        <div className={'quiz-page'}>
            <div className={'quiz-invitations'}>
                <header className={'quiz-hero'}>
                    <div className={'quiz-hero-icon'} aria-hidden><FontAwesomeIcon icon={faWandMagicSparkles}/></div>
                    <div className={'quiz-hero-text'}>
                        <h1 className={'quiz-title'}>{t('my_quizzes', 'My quizzes')}</h1>
                        <p className={'quiz-subtitle'}>{t('my_quizzes_subtitle', 'The quizzes you made.')}</p>
                    </div>
                </header>

                <QuizTabs/>

                {quizzes === null ? (
                    <div className={'quiz-invitations-loading'} aria-label={t('loading', 'Loading')}/>
                ) : quizzes.length ? (
                    <ul className={'quiz-invitations-list'}>
                        {quizzes.map(quiz => (
                            <li key={quiz.quizId} className={'quiz-invitation'}>
                                <div className={'quiz-invitation-body'}>
                                    <span className={'quiz-invitation-from'}>
                                        {t(quiz.quizType, toLabel(quiz.quizType))}
                                        <span className={'quiz-invitation-date'}>{date(quiz.createdAt)}</span>
                                    </span>
                                    <span className={'quiz-invitation-details'}>
                                        {t('questions_count', '{{count}} questions', {count: quiz.questionsCount})}
                                        {' · '}
                                        {t('seconds_each', '{{count}} s each', {count: quiz.questionTime})}
                                        {' · '}
                                        {t('invited_count', '{{count}} invited', {count: quiz.invited})}
                                        {' · '}
                                        {t('played_count', 'played {{count}} times', {count: quiz.played})}
                                    </span>
                                </div>
                                <button type={'button'} className={'quiz-invitation-copy'}
                                        onClick={() => copyLink(quiz.quizId)}
                                        data-tooltip={t('copy_link', 'Copy link')}>
                                    <FontAwesomeIcon icon={faLink}/>
                                    <span>{t('copy_link', 'Copy link')}</span>
                                </button>
                                <Link href={`/quiz/custom/${quiz.quizId}`} className={'quiz-invitation-play'}>
                                    <FontAwesomeIcon icon={faPlay}/>
                                    <span>{t('play', 'Play')}</span>
                                </Link>
                                <button type={'button'} className={'quiz-invitation-delete'}
                                        onClick={() => setPendingDelete(quiz)}
                                        aria-label={t('delete_quiz', 'Delete quiz')}
                                        data-tooltip={t('delete', 'Delete')}>
                                    <FontAwesomeIcon icon={faTrashCan}/>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={'quiz-empty'}>
                        {t('no_my_quizzes', 'You have not made a quiz yet.')}
                        {' '}
                        <Link href={'/quiz/create'}>{t('create_quiz', 'Create a quiz')}</Link>
                    </p>
                )}
            </div>

            <ConfirmDialog open={Boolean(pendingDelete)}
                           danger
                           busy={deleting}
                           title={t('delete_quiz_title', 'Delete this quiz?')}
                           message={t('delete_quiz_confirm',
                               'Its questions, its invitations and everyone’s results for it will be deleted too. This cannot be undone.')}
                           confirmLabel={t('delete', 'Delete')}
                           onConfirm={confirmDelete}
                           onCancel={() => setPendingDelete(null)}/>
        </div>
    );
}

MyQuizzes.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default MyQuizzes;
