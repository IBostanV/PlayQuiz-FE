import React from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBrain} from '@fortawesome/free-solid-svg-icons';
import {ReviewCard} from '../../components/review/review-card';

// The mistakes deck on a page of its own: what it is, and the deck itself.
function Review({isLoggedIn}) {
    const {t} = useTranslation();

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('review_sign_in', 'Log in to keep a deck of your mistakes')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    return (
        <section className='together-page'>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faBrain}/></span>
                <div>
                    <h1 className='trophies-title'>{t('review_deck', 'Mistakes deck')}</h1>
                    <p className='trophies-lead'>
                        {t('review_lead', 'Every question you get wrong comes back: tomorrow, then in 3 days, then in a week. Get it right each time and it leaves the deck; get it wrong and it starts over.')}
                    </p>
                </div>
            </header>
            <ReviewCard/>
        </section>
    );
}

Review.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default Review;
