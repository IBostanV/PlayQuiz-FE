import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faShareNodes} from '@fortawesome/free-solid-svg-icons';
import {isRight} from '../quiz/answer-list';

// The day's puzzle as a few lines anyone can paste: its number, the score, one square per question
// in the order asked, and the streak. No questions or answers in it, so it spoils nothing.
export const dailyShareText = (day, answers) => {
    const right = answers.filter(isRight).length;
    const grid = answers.map(answer => (isRight(answer) ? '🟩' : '🟥')).join('');
    const streak = day.streak > 1 ? `\n🔥 ${day.streak}` : '';
    return `PlayQuiz #${day.number} ${right}/${answers.length}\n${grid}${streak}\n${window.location.origin}`;
};

// Shares through the phone's own share sheet where there is one, and copies the text elsewhere.
export const ShareDaily = ({day, answers}) => {
    const {t} = useTranslation();

    const share = () => {
        const text = dailyShareText(day, answers);
        if (navigator.share) {
            navigator.share({text}).catch(() => undefined);
            return;
        }
        navigator.clipboard?.writeText(text)
            .then(() => toast.success(t('share_copied', 'Copied — paste it anywhere')))
            .catch(() => toast.error(t('share_failed', 'Could not copy')));
    };

    return (
        <button type='button' className='result-share' onClick={share}>
            <FontAwesomeIcon icon={faShareNodes}/>
            <span>{t('share_result', 'Share result')}</span>
        </button>
    );
};

ShareDaily.propTypes = {
    day: PropTypes.shape({number: PropTypes.number, streak: PropTypes.number}).isRequired,
    answers: PropTypes.array.isRequired,
};
