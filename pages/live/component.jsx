import React, {useEffect, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {questionText} from '../../utils/translated';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowLeft, faBolt, faCheck, faCopy, faCrown, faDoorOpen, faMedal, faPlay, faRightFromBracket, faXmark,
} from '@fortawesome/free-solid-svg-icons';
import {answerRoom, getRoom, joinRoom, leaveRoom, LIVE_TOPIC, startRoom} from '../../api/live';
import {useChatNotifications} from '../../context/chat-notifications';
import {Avatar} from '../../components/common/avatar';
import {useQuizInProgress} from '../../utils/quiz-in-progress';

const LETTERS = 'ABCDEFGH';

// Which option the reveal says was right: glossary options by term, the rest by answer id.
const isRightOption = (option, reveal) => (reveal?.termId != null
    ? option.termId === reveal.termId
    : reveal?.answerId != null && option.id === reveal.answerId);

const samePick = (option, pick) => Boolean(pick)
    && (pick.termId != null ? option.termId === pick.termId : pick.id != null && option.id === pick.id);

// A live duel or room. The server runs the match; this page shows the room it pushes and sends
// what the player does. Its clock is corrected by the server's, so everyone's countdown ends
// together whatever the local clock says.
function LiveMatch({isLoggedIn}) {
    const {t, i18n} = useTranslation();
    const router = useRouter();
    const {subscribe} = useChatNotifications();
    const code = String(router.query.code ?? '').toUpperCase();

    const [room, setRoom] = useState(null);
    const [closed, setClosed] = useState(null);
    const [missing, setMissing] = useState(false);
    const [now, setNow] = useState(Date.now());
    const offset = useRef(0);
    const [picking, setPicking] = useState(false);
    // The lobby too: the host can start the match at any moment.
    useQuizInProgress(!closed && !missing && !['FINISHED', 'CLOSED'].includes(room?.phase));

    const show = (next) => {
        if (!next) return;
        offset.current = next.serverNow - Date.now();
        setRoom(next);
    };

    // Joined straight from an invitation or a code (?join=1); otherwise just looked at, which
    // also works for someone invited who has not said yes yet.
    useEffect(() => {
        if (!router.isReady || !isLoggedIn) return;
        const load = router.query.join ? joinRoom(code) : getRoom(code);
        load.then(result => (result ? show(result) : setMissing(true)));
    }, [router.isReady, code]);

    useEffect(() => subscribe((event, topic) => {
        if (topic !== LIVE_TOPIC || event.code !== code) return;
        if (event.type === 'ROOM') show(event.room);
        if (event.type === 'CLOSED') setClosed(event.reason);
    }), [subscribe, code]);

    // The clock the countdowns read, a few times a second while something is timed.
    useEffect(() => {
        if (!room?.endsAt) return undefined;
        const timer = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(timer);
    }, [room?.endsAt]);

    // Leaving the page mid-match leaves the match, so the others are not kept waiting on an answer.
    const phaseRef = useRef(null);
    phaseRef.current = room?.phase;
    useEffect(() => () => {
        if (phaseRef.current && !['FINISHED', 'CLOSED'].includes(phaseRef.current)) leaveRoom(code);
    }, [code]);

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('together_sign_in', 'Log in to play with friends')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    if (closed || missing) {
        const reasons = {
            DECLINED: t('live_closed_declined', 'Your friend said no thanks this time.'),
            HOST_LEFT: t('live_closed_host', 'The host closed the room.'),
            EXPIRED: t('live_closed_expired', 'Nobody started the room, so it closed.'),
            REPLACED: t('live_closed_replaced', 'The host opened a new room instead.'),
        };
        return (
            <section className='live-page live-over'>
                <FontAwesomeIcon icon={faDoorOpen} className='live-over-icon'/>
                <p className='trophies-lead'>
                    {missing ? t('live_missing', 'That room does not exist any more.') : reasons[closed] ?? t('live_closed', 'The room closed.')}
                </p>
                <Link href='/challenges' className='home-card-play'>
                    <FontAwesomeIcon icon={faArrowLeft}/> {t('play_together', 'Play together')}
                </Link>
            </section>
        );
    }

    if (!room) {
        return <section className='live-page'><div className='quiz-loading' aria-label={t('loading', 'Loading')}/></section>;
    }

    const me = room.players.find(player => player.user?.id === room.you);
    const isHost = room.hostId === room.you;
    const left = Math.max(0, (room.endsAt - offset.current - now) / 1000);
    const share = room.endsAt && room.seconds ? Math.min(1, left / room.seconds) : 0;

    const answer = (option) => {
        if (picking || room.yourAnswer || room.phase !== 'QUESTION') return;
        setPicking(true);
        answerRoom(code, room.index, {id: option.id ?? undefined, termId: option.termId ?? undefined})
            .then(show)
            .finally(() => setPicking(false));
    };

    const copyLink = () => {
        navigator.clipboard?.writeText(`${window.location.origin}/live/${code}?join=1`)
            .then(() => toast.success(t('link_copied', 'Link copied')));
    };

    const leave = () => {
        leaveRoom(code).finally(() => router.push('/challenges'));
    };

    const scoreboard = (
        <ol className='live-board'>
            {room.players.map((player, index) => (
                <li key={player.user?.id} className='live-board-row'
                    data-you={player.user?.id === room.you || undefined} data-left={player.left || undefined}>
                    <span className='live-board-rank'>{room.phase === 'LOBBY' ? '' : index + 1}</span>
                    <Avatar name={player.user?.displayName ?? '?'} className='live-board-avatar'/>
                    <span className='live-board-name'>
                        {player.user?.displayName}
                        {player.host && <FontAwesomeIcon icon={faCrown} className='live-board-host'
                                                         data-tooltip={t('live_host', 'Host')}/>}
                    </span>
                    {room.phase === 'QUESTION' && (
                        <span className='live-board-state' data-answered={player.answered || undefined}>
                            {player.answered ? <FontAwesomeIcon icon={faCheck}/> : '…'}
                        </span>
                    )}
                    {room.phase === 'REVEAL' && (
                        <span className='live-board-gain' data-right={player.lastCorrect || undefined}>
                            {player.lastCorrect ? `+${player.lastPoints}` : <FontAwesomeIcon icon={faXmark}/>}
                        </span>
                    )}
                    {room.phase !== 'LOBBY' && <span className='live-board-score'>{player.score}</span>}
                </li>
            ))}
        </ol>
    );

    return (
        <section className='live-page' data-phase={room.phase}>
            <header className='live-head'>
                <span className='live-mode-badge' data-mode={room.mode}>
                    <FontAwesomeIcon icon={room.mode === 'DUEL' ? faBolt : faDoorOpen}/>
                    {room.mode === 'DUEL' ? t('live_duel_title', 'Live duel') : t('live_room_title', 'Live room')}
                </span>
                {['QUESTION', 'REVEAL'].includes(room.phase) && (
                    <span className='live-step'>
                        {t('question', 'Question')} <b>{room.index + 1}</b> / {room.total}
                    </span>
                )}
                {room.phase !== 'FINISHED' && (
                    <button type='button' className='live-leave' onClick={leave}>
                        <FontAwesomeIcon icon={faRightFromBracket}/> {t('live_leave', 'Leave')}
                    </button>
                )}
            </header>

            {room.phase === 'LOBBY' && (
                <div className='live-lobby'>
                    <p className='live-code-label'>{t('live_code_label', 'Room code')}</p>
                    <button type='button' className='live-code' onClick={copyLink}
                            data-tooltip={t('live_copy_link', 'Copy an invite link')}>
                        {code} <FontAwesomeIcon icon={faCopy}/>
                    </button>
                    <p className='home-card-sub'>
                        {t('live_lobby_sub', '{{questions}} questions, {{seconds}} seconds each.',
                            {questions: room.total, seconds: room.seconds})}
                    </p>

                    {scoreboard}

                    {room.invited.length > 0 && (
                        <p className='live-invited'>
                            {t('live_waiting_for', 'Invited: {{names}}',
                                {names: room.invited.map(user => user.displayName).join(', ')})}
                        </p>
                    )}

                    {isHost ? (
                        <button type='button' className='home-card-play live-go'
                                disabled={room.players.filter(player => !player.left).length < 2}
                                onClick={() => startRoom(code).then(show)}>
                            <FontAwesomeIcon icon={faPlay}/> {t('live_start', 'Start the match')}
                        </button>
                    ) : (
                        <p className='live-wait'>{t('live_wait_host', 'Waiting for the host to start…')}</p>
                    )}
                </div>
            )}

            {room.phase === 'COUNTDOWN' && (
                <div className='live-countdown' key='countdown'>
                    <span className='live-countdown-number'>{Math.max(1, Math.ceil(left))}</span>
                    <span className='home-card-sub'>{t('live_get_ready', 'Get ready')}</span>
                </div>
            )}

            {['QUESTION', 'REVEAL'].includes(room.phase) && room.question && (
                <div className='live-stage' key={room.index}>
                    <div className='live-timer' aria-hidden>
                        <span className='live-timer-fill' data-low={room.phase === 'QUESTION' && left <= 5 || undefined}
                              style={{width: `${(room.phase === 'QUESTION' ? share : 0) * 100}%`}}/>
                    </div>
                    <h2 className='live-question'>{questionText(room.question, i18n.language)}</h2>
                    <div className='live-options'>
                        {room.question.answers.map((option, index) => {
                            const picked = samePick(option, room.yourAnswer);
                            const state = room.phase === 'REVEAL'
                                ? isRightOption(option, room.reveal) ? 'right' : picked ? 'wrong' : 'faded'
                                : picked ? 'picked' : undefined;
                            return (
                                <button key={`${option.id}-${option.termId}-${index}`} type='button' className='live-option'
                                        data-state={state} disabled={room.phase !== 'QUESTION' || Boolean(room.yourAnswer) || picking}
                                        onClick={() => answer(option)}>
                                    <span className='live-option-letter'>{LETTERS[index]}</span>
                                    <span>{option.content}</span>
                                </button>
                            );
                        })}
                    </div>
                    {room.phase === 'REVEAL' && me && (
                        <p className='live-verdict' data-right={me.lastCorrect || undefined}>
                            {me.lastCorrect
                                ? t('live_right', 'Right! +{{points}}', {points: me.lastPoints})
                                : room.yourAnswer ? t('live_wrong', 'Not this time') : t('live_too_slow', 'Out of time')}
                        </p>
                    )}
                    {scoreboard}
                </div>
            )}

            {room.phase === 'FINISHED' && (
                <div className='live-finish'>
                    <ol className='live-podium'>
                        {room.players.slice(0, 3).map((player, index) => (
                            <li key={player.user?.id} className='live-podium-step' data-place={index + 1}>
                                <FontAwesomeIcon icon={index === 0 ? faCrown : faMedal} className='live-podium-icon'/>
                                <Avatar name={player.user?.displayName ?? '?'} className='live-podium-avatar'/>
                                <span className='live-podium-name'>{player.user?.displayName}</span>
                                <span className='live-podium-score'>{player.score}</span>
                                <span className='live-podium-block'>{index + 1}</span>
                            </li>
                        ))}
                    </ol>
                    <p className='live-finish-line'>
                        {room.players[0]?.user?.id === room.you
                            ? t('live_you_won', 'You won!')
                            : t('live_winner', '{{name}} wins', {name: room.players[0]?.user?.displayName})}
                        {me && ` · ${t('live_your_right', '{{right}}/{{total}} right', {right: me.correct, total: room.total})}`}
                    </p>
                    {room.players.length > 3 && scoreboard}
                    <Link href='/challenges' className='home-card-play'>
                        <FontAwesomeIcon icon={faBolt}/> {t('live_again', 'Play again')}
                    </Link>
                </div>
            )}
        </section>
    );
}

LiveMatch.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default LiveMatch;
