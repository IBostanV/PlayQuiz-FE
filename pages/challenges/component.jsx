import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faHandFist, faPeopleGroup, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getChallenges} from '../../api/social';
import {DailyChallenge} from '../../components/social/daily-challenge';
import {LiveStart} from '../../components/social/live-start';
import {Versus} from '../../components/social/versus';

// Everything played with other people, in one place: live duels and rooms, the daily challenge,
// and the challenges sent and received.
function Together({isLoggedIn}) {
    const {t} = useTranslation();
    const [challenges, setChallenges] = useState(null);

    useEffect(() => {
        if (isLoggedIn) getChallenges().then(result => setChallenges(result ?? {received: [], sent: []}));
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('together_sign_in', 'Log in to play with friends')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    const received = challenges?.received ?? [];
    const sent = challenges?.sent ?? [];

    return (
        <section className='together-page'>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faPeopleGroup}/></span>
                <div>
                    <h1 className='trophies-title'>{t('play_together', 'Play together')}</h1>
                    <p className='trophies-lead'>
                        {t('together_lead', 'Duel a friend live, fill a room, race everyone on today\'s questions, or send a score to beat.')}
                    </p>
                </div>
            </header>

            <LiveStart/>
            <DailyChallenge/>

            <section className='home-card' data-wide='true' aria-labelledby='challenges-title'>
                <header className='home-card-header'>
                    <span className='home-card-icon' data-tone='amber' aria-hidden><FontAwesomeIcon icon={faHandFist}/></span>
                    <div>
                        <h2 id='challenges-title' className='home-card-title'>{t('challenges', 'Challenges')}</h2>
                        <span className='home-card-sub'>
                            {t('challenges_sub', 'Send one from any quiz result: your friend gets the same questions.')}
                        </span>
                    </div>
                </header>

                {challenges && !received.length && !sent.length && (
                    <p className='home-card-sub'>{t('challenges_none', 'No challenges in the last month yet.')}</p>
                )}

                {received.length > 0 && <h3 className='nav-bell-group-title'>{t('challenges_received', 'For you')}</h3>}
                <ul className='challenge-list'>
                    {received.map(challenge => (
                        <li key={challenge.id} className='challenge-item'>
                            <span className='challenge-category'>{challenge.category ?? t('express_quiz', 'Express quiz')}</span>
                            {/* The reader is the opponent here, so the outcome is flipped from the challenger's. */}
                            <Versus left={challenge.opponent} right={challenge.challenger}
                                    leftScore={challenge.opponentScore} rightScore={challenge.challengerScore}
                                    outcome={{WON: 'LOST', LOST: 'WON', DRAW: 'DRAW'}[challenge.outcome] ?? null}/>
                            {!challenge.opponentScore && (
                                <Link href={`/quiz/categorized/0?challenge=${challenge.id}`} className='home-card-play'>
                                    <FontAwesomeIcon icon={faPlay}/> {t('challenge_accept', 'Take it on')}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>

                {sent.length > 0 && <h3 className='nav-bell-group-title'>{t('challenges_sent', 'Sent by you')}</h3>}
                <ul className='challenge-list'>
                    {sent.map(challenge => (
                        <li key={challenge.id} className='challenge-item'>
                            <span className='challenge-category'>{challenge.category ?? t('express_quiz', 'Express quiz')}</span>
                            <Versus left={challenge.challenger} right={challenge.opponent}
                                    leftScore={challenge.challengerScore} rightScore={challenge.opponentScore}
                                    outcome={challenge.outcome}/>
                        </li>
                    ))}
                </ul>
            </section>
        </section>
    );
}

Together.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default Together;
