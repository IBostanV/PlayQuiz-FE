import React, {useState} from 'react';
import {hasCookie} from 'cookies-next';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faClock, faCoins, faLightbulb} from '@fortawesome/free-solid-svg-icons';
import {buyExtraTime, buyHint, EXTRA_TIME_SECONDS, PRICES} from '../../api/coin';

// Things a player can spend coins on mid-quiz. Signed out there are no coins, so nothing shows.

// 50/50: the server says which options to take away; onRemove gets their termIds. Once per
// question — with two options left there is nothing more to take.
export const HintButton = ({question, onRemove}) => {
    const {t} = useTranslation();
    const [busy, setBusy] = useState(false);
    const termIds = (question?.answers ?? []).map(answer => answer.termId).filter(Boolean);
    if (!hasCookie('authorization') || termIds.length <= 2) return null;

    const buy = () => {
        setBusy(true);
        buyHint(question.id, termIds)
            .then(purchase => purchase?.remove && onRemove(purchase.remove))
            .finally(() => setBusy(false));
    };

    return (
        <button type="button" className="quiz-coin-action" onClick={buy} disabled={busy}>
            <FontAwesomeIcon icon={faLightbulb}/> {t('hint_fifty_fifty', '50/50')}
            <span className="quiz-coin-price"><FontAwesomeIcon icon={faCoins}/> {PRICES.HINT}</span>
        </button>
    );
};

// Extra seconds on a timed quiz: paid for on the server, added to the clock by onAdd.
export const ExtraTimeButton = ({onAdd}) => {
    const {t} = useTranslation();
    const [busy, setBusy] = useState(false);
    if (!hasCookie('authorization')) return null;

    const buy = () => {
        setBusy(true);
        buyExtraTime()
            .then(purchase => purchase && onAdd(EXTRA_TIME_SECONDS))
            .finally(() => setBusy(false));
    };

    return (
        <button type="button" className="quiz-coin-action" onClick={buy} disabled={busy}>
            <FontAwesomeIcon icon={faClock}/> {t('extra_time', '+{{seconds}}s', {seconds: EXTRA_TIME_SECONDS})}
            <span className="quiz-coin-price"><FontAwesomeIcon icon={faCoins}/> {PRICES.EXTRA_TIME}</span>
        </button>
    );
};

// A question with the hinted-away options gone.
export const withoutOptions = (question, termIds) => ({
    ...question,
    answers: question.answers.filter(answer => !termIds.includes(answer.termId)),
});
