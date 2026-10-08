import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBolt, faCheck, faClone, faDoorOpen, faRightToBracket, faUsers} from '@fortawesome/free-solid-svg-icons';
import getFriends from '../../api/user/get-friends';
import getUserGroups from '../../api/user/getUserGroups';
import {getOnlineFriends} from '../../api/social';
import {createRoom} from '../../api/live';
import {groupTitle, toGroups} from '../../utils/groups';
import {Avatar} from '../common/avatar';

const QUESTION_COUNTS = [5, 10, 15];
const SECONDS = [10, 15, 20];
// The pairs game: how many pairs on the table, and the seconds a turn has.
// Any number from 4 up to one pair per card picture (LiveService.FACES).
const PAIR_COUNTS = Array.from({length: 27}, (_, index) => index + 4);
const TURN_SECONDS = [10, 20, 30];
// Up to 4 at a table: the host and three.
const PAIRS_INVITES = 3;

// Starting something live: a duel against one friend who is on the site now, a room for as many
// as want in (friends and a chat group invited, anyone else by its code), or joining a room from
// a code somebody shared.
export const LiveStart = () => {
    const {t} = useTranslation();
    const router = useRouter();
    const [friends, setFriends] = useState([]);
    const [online, setOnline] = useState(new Map());
    const [groups, setGroups] = useState([]);
    const [mode, setMode] = useState('DUEL');
    const [picked, setPicked] = useState(new Set());
    const [groupId, setGroupId] = useState('');
    const [questions, setQuestions] = useState(10);
    const [seconds, setSeconds] = useState(15);
    const [pairCount, setPairCount] = useState(8);
    const [turnSeconds, setTurnSeconds] = useState(20);
    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getFriends().then(list => setFriends(Array.isArray(list) ? list : []));
        getUserGroups().then(rows => setGroups(toGroups(rows)));
        // Who is on now, and busy or not: refreshed while the page is open.
        const reload = () => getOnlineFriends().then(list =>
            setOnline(new Map((Array.isArray(list) ? list : []).map(each => [each.id, each.activity]))));
        reload();
        const timer = setInterval(reload, 30000);
        return () => clearInterval(timer);
    }, []);

    // Online first, then by name: a duel can only go to somebody who will see it.
    const sorted = [...friends].sort((a, b) =>
        Number(online.has(b.id)) - Number(online.has(a.id)) || a.displayName.localeCompare(b.displayName));

    const pick = (id) => setPicked(current => {
        if (mode === 'DUEL') return new Set(current.has(id) ? [] : [id]);
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else if (mode !== 'PAIRS' || next.size < PAIRS_INVITES) next.add(id);
        return next;
    });

    const switchMode = (next) => {
        setMode(next);
        setPicked(new Set());
    };

    const start = () => {
        setBusy(true);
        createRoom({
            mode,
            friendIds: [...picked],
            groupId: mode === 'ROOM' && groupId ? Number(groupId) : null,
            questions: {DUEL: 7, PAIRS: pairCount}[mode] ?? questions,
            seconds: mode === 'PAIRS' ? turnSeconds : seconds,
        }).then(room => room?.code && router.push(`/live/${room.code}`))
            .finally(() => setBusy(false));
    };

    const join = (event) => {
        event.preventDefault();
        const clean = code.trim().toUpperCase();
        if (clean) router.push(`/live/${clean}?join=1`);
    };

    const canStart = mode === 'DUEL' ? picked.size === 1 : true;

    return (
        <section className='home-card live-start' data-wide='true' aria-labelledby='live-start-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' data-tone='pink' aria-hidden><FontAwesomeIcon icon={faBolt}/></span>
                <div>
                    <h2 id='live-start-title' className='home-card-title'>{t('live_play', 'Play live')}</h2>
                    <span className='home-card-sub'>
                        {t('live_play_sub', 'Same question, same moment. Right and fast wins.')}
                    </span>
                </div>
            </header>

            <div className='live-modes' role='radiogroup'>
                {[
                    ['DUEL', faBolt, t('live_duel', 'Duel a friend')],
                    ['ROOM', faDoorOpen, t('live_room', 'Open a room')],
                    ['PAIRS', faClone, t('pairs_mode', 'Pairs')],
                ]
                    .map(([value, icon, label]) => (
                        <button key={value} type='button' role='radio' aria-checked={mode === value}
                                className='live-mode' onClick={() => switchMode(value)}>
                            <FontAwesomeIcon icon={icon}/> {label}
                        </button>
                    ))}
            </div>

            {mode === 'ROOM' && (
                <div className='live-settings'>
                    <label className='live-setting'>
                        {t('live_questions', 'Questions')}
                        <select value={questions} onChange={event => setQuestions(Number(event.target.value))}>
                            {QUESTION_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
                        </select>
                    </label>
                    <label className='live-setting'>
                        {t('live_seconds', 'Seconds each')}
                        <select value={seconds} onChange={event => setSeconds(Number(event.target.value))}>
                            {SECONDS.map(value => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </label>
                    {groups.length > 0 && (
                        <label className='live-setting'>
                            <FontAwesomeIcon icon={faUsers}/> {t('live_invite_group', 'Invite a group')}
                            <select value={groupId} onChange={event => setGroupId(event.target.value)}>
                                <option value=''>{t('none', 'None')}</option>
                                {groups.map(group => (
                                    <option key={group.groupId} value={group.groupId}>{groupTitle(group, '?')}</option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>
            )}

            {mode === 'PAIRS' && (
                <div className='live-settings'>
                    <label className='live-setting'>
                        {t('pairs_count', 'Pairs')}
                        <select value={pairCount} onChange={event => setPairCount(Number(event.target.value))}>
                            {PAIR_COUNTS.map(count => <option key={count} value={count}>{count}</option>)}
                        </select>
                    </label>
                    <label className='live-setting'>
                        {t('pairs_turn_seconds', 'Seconds a turn')}
                        <select value={turnSeconds} onChange={event => setTurnSeconds(Number(event.target.value))}>
                            {TURN_SECONDS.map(value => <option key={value} value={value}>{value}</option>)}
                        </select>
                    </label>
                </div>
            )}

            <p className='live-friends-label'>
                {{
                    DUEL: t('live_pick_opponent', 'Who do you want to duel? Only friends on the site now see it.'),
                    PAIRS: t('pairs_pick_friends', 'Take turns turning two cards over; a pair is yours and you go again. Invite up to 3 friends, or share the code.'),
                }[mode] ?? t('live_pick_friends', 'Invite friends (optional): anyone with the code can join too.')}
            </p>
            {sorted.length ? (
                <ul className='live-friends'>
                    {sorted.map(friend => {
                        const isOnline = online.has(friend.id);
                        const busyWith = online.get(friend.id);
                        const disabled = mode === 'DUEL' && (!isOnline || Boolean(busyWith));
                        return (
                            <li key={friend.id}>
                                <button type='button' className='live-friend' disabled={disabled}
                                        aria-pressed={picked.has(friend.id)} onClick={() => pick(friend.id)}>
                                    <span className='live-friend-face'>
                                        <Avatar name={friend.displayName} photo={friend.photo} className='live-friend-avatar'/>
                                        <span className='presence-dot' data-online={isOnline || undefined}
                                              data-busy={busyWith ? 'true' : undefined}/>
                                    </span>
                                    <span className='live-friend-name'>{friend.displayName}</span>
                                    <span className='live-friend-state'>
                                        {busyWith
                                            ? t('presence_playing', 'In a match')
                                            : isOnline ? t('presence_online', 'Online') : t('presence_offline', 'Offline')}
                                    </span>
                                    {picked.has(friend.id) && <FontAwesomeIcon icon={faCheck} className='live-friend-check'/>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className='home-card-sub'>{t('challenge_no_friends', 'Add some friends first, from the friends panel.')}</p>
            )}

            <div className='live-start-actions'>
                <button type='button' className='home-card-play' disabled={!canStart || busy} onClick={start}>
                    <FontAwesomeIcon icon={{DUEL: faBolt, PAIRS: faClone}[mode] ?? faDoorOpen}/>
                    {{
                        DUEL: t('live_send_duel', 'Send duel'),
                        PAIRS: t('pairs_open', 'Open a pairs table'),
                    }[mode] ?? t('live_open_room', 'Open room')}
                </button>

                <form className='live-join' onSubmit={join}>
                    <input value={code} onChange={event => setCode(event.target.value)} maxLength={6}
                           placeholder={t('live_code', 'Room code')} aria-label={t('live_code', 'Room code')}/>
                    <button type='submit' className='home-card-play' data-quiet='true' disabled={!code.trim()}
                            aria-label={t('live_join', 'Join')} data-tooltip={t('live_join', 'Join')}>
                        <FontAwesomeIcon icon={faRightToBracket}/>
                    </button>
                </form>
            </div>
        </section>
    );
};
