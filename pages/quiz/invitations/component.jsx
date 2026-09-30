import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faEnvelopeOpenText, faPlay, faRotateRight} from '@fortawesome/free-solid-svg-icons';
import {getQuizInvitations} from '../../../api/quiz';
import {toLabel} from '../../../api/quiz/get-quiz-types';
import {Avatar} from '../../../components/common/avatar';
import {QuizTabs} from '../../../components/quiz/quiz-tabs';
import {formatDate} from '../../../utils/toDate';

// The custom quizzes other players invited me to, newest first, each one a click from playing.
// Played ones say so, and can be played again.
function QuizInvitations({isLoggedIn}) {
    const {t, i18n} = useTranslation();
    const router = useRouter();
    // null until loaded, so the empty message never flashes before the list.
    const [invitations, setInvitations] = useState(null);

    useEffect(() => {
        if (!isLoggedIn) {
            router.replace('/login');
            return;
        }
        getQuizInvitations().then(list => setInvitations(list ?? []));
    }, [isLoggedIn]);

    const date = (value) => formatDate(value, i18n.language, {day: 'numeric', month: 'short', year: 'numeric'});

    return (
        <div className={'quiz-page'}>
            <div className={'quiz-invitations'}>
                <header className={'quiz-hero'}>
                    <div className={'quiz-hero-icon'} aria-hidden><FontAwesomeIcon icon={faEnvelopeOpenText}/></div>
                    <div className={'quiz-hero-text'}>
                        <h1 className={'quiz-title'}>{t('quiz_invitations', 'Quiz invitations')}</h1>
                        <p className={'quiz-subtitle'}>
                            {t('quiz_invitations_subtitle', 'Quizzes other players made and invited you to.')}
                        </p>
                    </div>
                </header>

                <QuizTabs/>

                {invitations === null ? (
                    <div className={'quiz-invitations-loading'} aria-label={t('loading', 'Loading')}/>
                ) : invitations.length ? (
                    <ul className={'quiz-invitations-list'}>
                        {invitations.map(invitation => (
                            <li key={invitation.quizId} className={'quiz-invitation'}>
                                <Avatar name={invitation.invitedBy?.displayName ?? '?'}/>
                                <div className={'quiz-invitation-body'}>
                                    <span className={'quiz-invitation-from'}>
                                        {t('invited_by', 'From {{name}}', {name: invitation.invitedBy?.displayName ?? '?'})}
                                        <span className={'quiz-invitation-date'}>{date(invitation.invitedAt)}</span>
                                    </span>
                                    <span className={'quiz-invitation-details'}>
                                        {t(invitation.quizType, toLabel(invitation.quizType))}
                                        {' · '}
                                        {t('questions_count', '{{count}} questions', {count: invitation.questionsCount})}
                                        {' · '}
                                        {t('seconds_each', '{{count}} s each', {count: invitation.questionTime})}
                                    </span>
                                </div>
                                {invitation.played && (
                                    <span className={'quiz-invitation-played'}>
                                        <FontAwesomeIcon icon={faCheck}/> {t('played', 'Played')}
                                    </span>
                                )}
                                <Link href={`/quiz/custom/${invitation.quizId}`} className={'quiz-invitation-play'}>
                                    <FontAwesomeIcon icon={invitation.played ? faRotateRight : faPlay}/>
                                    <span>{invitation.played ? t('play_again', 'Play again') : t('play', 'Play')}</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={'quiz-empty'}>
                        {t('no_quiz_invitations', 'No invitations yet. When someone invites you to their quiz, it shows up here.')}
                    </p>
                )}
            </div>
        </div>
    );
}

QuizInvitations.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default QuizInvitations;
