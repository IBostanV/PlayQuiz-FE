import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faBrain, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getReviewStatus} from '../../api/review';
import {formatDate} from '../../utils/toDate';

// The rungs of the ladder, by how long until a question on each comes back.
const RUNGS = [
    ['review_box_1', 'Tomorrow'],
    ['review_box_3', 'In 3 days'],
    ['review_box_7', 'In a week'],
];

// The mistakes deck: how many questions are due today, a review to start, and where the rest sit on
// the 1-3-7 day ladder. On the home page only once there is something in the deck.
export const ReviewCard = ({compact}) => {
    const {t} = useTranslation();
    const [status, setStatus] = useState(null);

    useEffect(() => {
        getReviewStatus().then(result => setStatus(result ?? null));
    }, []);

    if (!status || (compact && !status.total)) return null;

    return (
        <section className='home-card review-card' data-wide={compact ? undefined : 'true'} aria-labelledby='review-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='pink' aria-hidden><FontAwesomeIcon icon={faBrain}/></span>
                <div>
                    <h2 id='review-title' className='home-card-title'>{t('review_deck', 'Mistakes deck')}</h2>
                    <span className='home-card-sub'>
                        {t('review_sub', 'What you got wrong comes back until you know it: {{count}} in the deck', {count: status.total})}
                    </span>
                </div>
            </header>

            <p className='review-due'>
                <span className='review-due-count'>{status.due}</span>
                {t('review_due_today', 'due today')}
            </p>

            {status.due > 0 ? (
                <Link href='/quiz/categorized/0?review=1' className='home-card-play review-play'>
                    <FontAwesomeIcon icon={faPlay}/> {t('review_start', 'Review {{count}} now', {count: Math.min(status.due, 10)})}
                </Link>
            ) : (
                <p className='home-card-sub'>
                    {status.nextDue
                        ? t('review_next', 'Next ones come back on {{date}}', {date: formatDate(status.nextDue, undefined, {dateStyle: 'medium'})})
                        : t('review_empty', 'Nothing to review. Wrong answers from your quizzes land here.')}
                </p>
            )}

            {!compact && (
                <ol className='review-ladder' aria-label={t('review_ladder', 'The ladder')}>
                    {RUNGS.map((label, box) => (
                        <li key={box} className='review-rung'>
                            <span className='review-rung-count'>{status.boxes?.[box] ?? 0}</span>
                            <span className='review-rung-label'>{t(...label)}</span>
                        </li>
                    ))}
                </ol>
            )}

            {compact && (
                <Link href='/review' className='did-you-know-more home-card-more'>
                    {t('review_open', 'Open the deck')}
                    <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
                </Link>
            )}
        </section>
    );
};

ReviewCard.propTypes = {
    compact: PropTypes.bool,
};
