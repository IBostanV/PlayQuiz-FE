import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faCoins, faGift, faLock, faTicket} from '@fortawesome/free-solid-svg-icons';
import {claimTier, getSeason} from '../../api/season';
import {cosmeticName} from '../../components/cosmetic/wardrobe';

// Quest wording; the server sends only codes.
const QUESTS = {
    PLAY_QUIZZES: ['quest_play_quizzes', 'Finish {{target}} quizzes'],
    RIGHT_ANSWERS: ['quest_right_answers', 'Answer {{target}} questions right'],
    DAILY_PUZZLES: ['quest_daily_puzzles', 'Play the daily challenge on {{target}} days'],
    DUEL_ROUNDS: ['quest_duel_rounds', 'Play {{target}} duel rounds'],
};

const QUEST_LINKS = {
    PLAY_QUIZZES: '/quiz/categorized',
    RIGHT_ANSWERS: '/quiz/express',
    DAILY_PUZZLES: '/challenges',
    DUEL_ROUNDS: '/challenges#duels',
};

// "4d 6h" to a moment.
const left = (millis) => {
    const hours = Math.max(0, Math.round((millis - Date.now()) / 3600000));
    return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

// The season pass: this week's quests, and the season's ten tiers to claim as the points come in.
// Daily tasks count towards it too. Free for everyone; there is no paid track.
function SeasonPass({isLoggedIn}) {
    const {t} = useTranslation();
    const [season, setSeason] = useState(null);
    const [busy, setBusy] = useState(null);

    useEffect(() => {
        if (isLoggedIn) getSeason().then(result => setSeason(result?.tiers ? result : null));
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('season_sign_in', 'Log in to play the season pass')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }
    if (!season) return <section className='together-page' aria-busy/>;

    const claim = (tier) => {
        setBusy(tier);
        claimTier(tier).then(next => next?.tiers && setSeason(next)).finally(() => setBusy(null));
    };

    const top = season.tierPoints * season.tiers.length;
    const reached = Math.min(100, Math.round((season.points / top) * 100));

    return (
        <section className='together-page season-page'>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faTicket}/></span>
                <div>
                    <h1 className='trophies-title'>{t('season_title', 'Season {{number}}', {number: season.number})}</h1>
                    <p className='trophies-lead'>
                        {t('season_lead', '{{points}} season points · ends in {{left}}. Weekly quests and daily tasks fill the track; claim each tier as you reach it.',
                            {points: season.points, left: left(season.endsAt)})}
                    </p>
                </div>
            </header>

            <div className='season-track' role='progressbar' aria-valuemin={0} aria-valuemax={top} aria-valuenow={season.points}
                 aria-label={t('season_progress', 'Season progress')}>
                <span className='season-track-fill' style={{width: `${reached}%`}}/>
            </div>

            <section className='home-card' data-wide='true' aria-labelledby='season-quests-title'>
                <header className='home-card-header'>
                    <div>
                        <h2 id='season-quests-title' className='home-card-title'>{t('season_quests', 'This week\'s quests')}</h2>
                        <span className='home-card-sub'>{t('season_week_left', 'New quests in {{left}}', {left: left(season.weekEndsAt)})}</span>
                    </div>
                </header>
                <ul className='season-quests'>
                    {season.quests.map(quest => (
                        <li key={quest.code} className='season-quest' data-done={quest.completed || undefined}>
                            <span className='season-quest-mark' aria-hidden>
                                {quest.completed && <FontAwesomeIcon icon={faCheck}/>}
                            </span>
                            <Link href={QUEST_LINKS[quest.code] ?? '/home'} className='season-quest-name'>
                                {t(...(QUESTS[quest.code] ?? [quest.code, quest.code]), {target: quest.target})}
                            </Link>
                            <span className='daily-task-bar season-quest-bar'>
                                <span className='daily-task-fill' style={{width: `${Math.round((quest.progress / quest.target) * 100)}%`}}/>
                            </span>
                            <span className='season-quest-count'>{quest.progress}/{quest.target}</span>
                            <span className='season-quest-points'>+{quest.points}</span>
                        </li>
                    ))}
                </ul>
            </section>

            <ol className='season-tiers'>
                {season.tiers.map(tier => (
                    <li key={tier.tier} className='season-tier' data-unlocked={tier.unlocked || undefined}
                        data-claimed={tier.claimed || undefined} data-special={tier.item ? 'true' : undefined}>
                        <span className='season-tier-number'>{tier.tier}</span>
                        <span className='season-tier-reward'>
                            {tier.item
                                ? <><FontAwesomeIcon icon={faGift}/> {cosmeticName(tier.item, t)}</>
                                : <><FontAwesomeIcon icon={faCoins}/> {tier.coins}</>}
                        </span>
                        <span className='season-tier-points'>{t('season_points_short', '{{points}} pts', {points: tier.points})}</span>
                        {tier.claimed ? (
                            <span className='season-tier-state'><FontAwesomeIcon icon={faCheck}/> {t('season_claimed', 'Claimed')}</span>
                        ) : tier.unlocked ? (
                            <button type='button' className='profile-secondary-button' disabled={busy === tier.tier}
                                    onClick={() => claim(tier.tier)}>
                                {t('season_claim', 'Claim')}
                            </button>
                        ) : (
                            <span className='season-tier-state'><FontAwesomeIcon icon={faLock}/></span>
                        )}
                    </li>
                ))}
            </ol>
        </section>
    );
}

SeasonPass.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default SeasonPass;
