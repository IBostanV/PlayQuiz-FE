import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faEnvelopeOpenText, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getQuizInvitations} from '../../api/quiz';
import {toLabel} from '../../api/quiz/get-quiz-types';
import {Avatar} from '../common/avatar';

// How many to show here; the rest are one click away on the invitations page.
const SHOWN = 3;

// Home page: quizzes friends invited this player to and they have not played yet. Only there
// when there is something waiting, so it never takes room to say "nothing".
export const HomeInvitations = () => {
    const {t} = useTranslation();
    const [waiting, setWaiting] = useState([]);

    useEffect(() => {
        getQuizInvitations().then(list => setWaiting((Array.isArray(list) ? list : []).filter(each => !each.played)));
    }, []);

    if (!waiting.length) return null;

    return (
        <section className='home-card' data-wide='true' aria-labelledby='home-invitations-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='pink' aria-hidden><FontAwesomeIcon icon={faEnvelopeOpenText}/></span>
                <div>
                    <h2 id='home-invitations-title' className='home-card-title'>
                        {t('home_invitations', 'Waiting for you')}
                    </h2>
                    <span className='home-card-sub'>
                        {t('home_invitations_count', '{{count}} quiz invitations', {count: waiting.length})}
                    </span>
                </div>
            </header>

            <ul className='home-card-rows'>
                {waiting.slice(0, SHOWN).map(invitation => (
                    <li key={invitation.quizId} className='home-card-row'>
                        <Avatar name={invitation.invitedBy?.displayName ?? '?'} className='home-card-row-avatar'/>
                        <span className='home-card-row-body'>
                            <span className='home-card-row-title'>
                                {t('invited_by', 'From {{name}}', {name: invitation.invitedBy?.displayName ?? '?'})}
                            </span>
                            <span className='home-card-row-meta'>
                                {t(invitation.quizType, toLabel(invitation.quizType))}
                                {' · '}
                                {t('questions_count', '{{count}} questions', {count: invitation.questionsCount})}
                            </span>
                        </span>
                        <Link href={`/quiz/custom/${invitation.quizId}`} className='home-card-play'>
                            <FontAwesomeIcon icon={faPlay}/> {t('play', 'Play')}
                        </Link>
                    </li>
                ))}
            </ul>

            {waiting.length > SHOWN && (
                <Link href='/quiz/invitations' className='did-you-know-more home-card-more'>
                    {t('home_invitations_all', 'All invitations')}
                    <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
                </Link>
            )}
        </section>
    );
};
