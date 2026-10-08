import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBolt, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getDuels, startDuel} from '../../api/duels';
import {getFriends} from '../../api/user';
import {Avatar} from '../common/avatar';

const ROUNDS = 5;

// "5h 12m" to the end of a turn.
const left = (millis) => {
    const minutes = Math.max(0, Math.round((millis - Date.now()) / 60000));
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

// One round as a dot from the reader's side: won, lost, drawn, or still to play.
const roundMark = (round, mine) => {
    const own = mine === 'CHALLENGER' ? round?.challenger : round?.opponent;
    const theirs = mine === 'CHALLENGER' ? round?.opponent : round?.challenger;
    if (!own || !theirs) return 'open';
    if (own.rightAnswers !== theirs.rightAnswers) return own.rightAnswers > theirs.rightAnswers ? 'won' : 'lost';
    const time = (score) => score.spentTime ?? 0;
    if (time(own) !== time(theirs)) return time(own) < time(theirs) ? 'won' : 'lost';
    return 'draw';
};

// Turn-based duels on the Together page: start one with a friend, and play your turn of the ones
// going on. Five rounds of five questions, first to three, a day for each turn.
export const Duels = () => {
    const {t} = useTranslation();
    const [duels, setDuels] = useState(null);
    const [friends, setFriends] = useState([]);
    const [friendId, setFriendId] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getDuels().then(list => setDuels(Array.isArray(list) ? list : []));
        getFriends().then(list => setFriends(Array.isArray(list) ? list : []));
    }, []);

    const start = (event) => {
        event.preventDefault();
        if (!friendId || busy) return;
        setBusy(true);
        startDuel(Number(friendId))
            .then(duel => {
                if (!duel?.id) return;
                setDuels(current => [duel, ...(current ?? []).filter(other => other.id !== duel.id)]);
                setFriendId('');
            })
            .finally(() => setBusy(false));
    };

    const status = (duel) => ({
        YOUR_TURN: t('duel_your_turn', 'Your turn · {{left}} left', {left: left(duel.deadlineMillis)}),
        THEIR_TURN: t('duel_their_turn', 'Their turn · {{left}} left', {left: left(duel.deadlineMillis)}),
        WON: duel.state.forfeit ? t('duel_won_forfeit', 'You won: they ran out of time') : t('duel_won', 'You won'),
        LOST: duel.state.forfeit ? t('duel_lost_forfeit', 'You lost: your turn ran out') : t('duel_lost', 'You lost'),
        DRAW: t('duel_draw', 'A draw'),
    }[duel.outcome]);

    return (
        <section className='home-card' data-wide='true' id='duels' aria-labelledby='duels-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='violet' aria-hidden><FontAwesomeIcon icon={faBolt}/></span>
                <div>
                    <h2 id='duels-title' className='home-card-title'>{t('duels', 'Duels')}</h2>
                    <span className='home-card-sub'>
                        {t('duels_sub', 'Turn by turn with a friend: 5 rounds of 5 questions, first to 3 wins, a day for each turn.')}
                    </span>
                </div>
            </header>

            <form className='duel-start' onSubmit={start}>
                <select value={friendId} onChange={event => setFriendId(event.target.value)}
                        aria-label={t('duel_pick_friend', 'Pick a friend')} disabled={!friends.length}>
                    <option value=''>{friends.length ? t('duel_pick_friend', 'Pick a friend') : t('duel_no_friends', 'Add friends to duel them')}</option>
                    {friends.map(friend => <option key={friend.id} value={friend.id}>{friend.displayName}</option>)}
                </select>
                <button type='submit' className='profile-secondary-button' disabled={!friendId || busy}>
                    {t('duel_start', 'Start duel')}
                </button>
            </form>

            {duels && !duels.length && <p className='home-card-sub'>{t('duels_none', 'No duels yet.')}</p>}

            <ul className='duel-list'>
                {(duels ?? []).map(duel => {
                    const mine = duel.me;
                    const me = mine === 'CHALLENGER' ? duel.challenger : duel.opponent;
                    const them = mine === 'CHALLENGER' ? duel.opponent : duel.challenger;
                    const myWins = mine === 'CHALLENGER' ? duel.state.challengerWins : duel.state.opponentWins;
                    const theirWins = mine === 'CHALLENGER' ? duel.state.opponentWins : duel.state.challengerWins;
                    return (
                        <li key={duel.id} className='duel-item' data-outcome={duel.outcome}>
                            <span className='duel-side'>
                                <Avatar name={me?.displayName ?? '?'} frame={me?.frame}/>
                                <span className='duel-score'>{myWins}</span>
                            </span>
                            <span className='duel-middle'>
                                <span className='duel-names'>
                                    {t('duel_versus', 'You vs')}{' '}
                                    <Link href={`/profile/${them?.id}`} style={{color: them?.nameColor ?? undefined}}>{them?.displayName}</Link>
                                </span>
                                <span className='duel-rounds' aria-label={t('duel_rounds', 'Rounds')}>
                                    {Array.from({length: ROUNDS}, (_, index) => (
                                        <span key={index} className='duel-round'
                                              data-mark={roundMark(duel.rounds.find(round => round.no === index + 1), mine)}
                                              data-current={duel.state.currentRound === index + 1 || undefined}/>
                                    ))}
                                </span>
                                <span className='duel-status'>{status(duel)}</span>
                            </span>
                            <span className='duel-side'>
                                <span className='duel-score'>{theirWins}</span>
                                <Avatar name={them?.displayName ?? '?'} frame={them?.frame}/>
                            </span>
                            {duel.outcome === 'YOUR_TURN' && (
                                <Link href={`/quiz/categorized/0?duel=${duel.id}`} className='home-card-play duel-play'>
                                    <FontAwesomeIcon icon={faPlay}/>
                                    {' '}{t('duel_play_round', 'Play round {{round}}', {round: duel.state.currentRound})}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};
