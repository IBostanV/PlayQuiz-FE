import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {Dropdown} from 'primereact/dropdown';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBolt, faChevronUp, faComments, faUserMinus, faUserPlus} from '@fortawesome/free-solid-svg-icons';
import {addFriend, getAllUsers, getFriends, removeFriend} from '../../api/user';
import getUserGroups from '../../api/user/getUserGroups';
import createGroup from '../../api/user/create-group';
import {getOnlineFriends} from '../../api/social';
import {createRoom} from '../../api/live';
import {ConfirmDialog} from '../common/popup';
import {Avatar} from '../common/avatar';


// The signed-in user's friends: add from all users, remove, or jump into a chat.
//
// Its own header is the toggle — the block is shut to that one line until it is clicked, which
// is what lets it sit in a corner of the screen without a button of its own beside it.
export const FriendsPanel = () => {
    const router = useRouter();
    const {t} = useTranslation();

    const [friends, setFriends] = useState([]);
    const [users, setUsers] = useState([]);
    const [candidate, setCandidate] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [pendingRemoval, setPendingRemoval] = useState(null);
    const [open, setOpen] = useState(false);

    const loadFriends = () => getFriends().then(result => setFriends(result ?? []));

    // Who of them is on the site now, and whether they are in a match: a green dot, and a duel
    // one click away. Polled while the page is open; the socket knows, but only the server does.
    const [online, setOnline] = useState(new Map());
    useEffect(() => {
        const reload = () => getOnlineFriends().then(list =>
            setOnline(new Map((Array.isArray(list) ? list : []).map(each => [each.id, each.activity]))));
        reload();
        const timer = setInterval(reload, 60000);
        return () => clearInterval(timer);
    }, [open]);

    const duel = (friend) => {
        setBusyId(friend.id);
        createRoom({mode: 'DUEL', friendIds: [friend.id]})
            .then(room => room?.code && router.push(`/live/${room.code}`))
            .finally(() => setBusyId(null));
    };

    // The count is on the shut header, so the friends themselves are read straight away; the
    // list of everyone else is only worth fetching once there is a dropdown to put it in.
    useEffect(() => {
        loadFriends();
    }, []);

    useEffect(() => {
        if (open) getAllUsers().then(result => setUsers(result ?? []));
    }, [open]);

    // Everyone except the current user and people already in the list.
    const currentUserId = typeof window === 'undefined' ? null : Number(localStorage.getItem('userId'));
    const friendIds = new Set(friends.map(friend => friend.id));
    const candidates = users
        .filter(user => user.id !== currentUserId && !friendIds.has(user.id))
        // Users and friends both come as { id, displayName }: no emails reach the browser.
        .map(user => ({value: user.id, label: user.displayName}));

    const add = () => {
        setBusyId(candidate);
        addFriend(candidate)
            .then(response => {
                if (!response) return;
                setCandidate(null);
                return loadFriends();
            })
            .finally(() => setBusyId(null));
    };

    // The remove button only opens the dialog; the dialog's confirm does the removal.
    const confirmRemove = () => {
        const friend = pendingRemoval;
        setBusyId(friend.id);
        removeFriend(friend.id)
            .then(response => response && setFriends(list => list.filter(item => item.id !== friend.id)))
            .finally(() => {
                setBusyId(null);
                setPendingRemoval(null);
            });
    };

    // Reuse the unnamed one-to-one chat with this friend if there is one, else start it.
    // get-user-groups returns one row per *other* member, so a 1:1 group is a groupId whose
    // only row is this friend.
    const chat = (friend) => {
        setBusyId(friend.id);
        getUserGroups()
            .then(rows => {
                const membersByGroup = new Map();
                (rows ?? []).forEach(row => membersByGroup.set(row.groupId,
                    [...(membersByGroup.get(row.groupId) ?? []), row]));
                const direct = Array.from(membersByGroup.values()).find(members =>
                    members.length === 1 && members[0].participantId === friend.id && !members[0].name);

                return direct ? direct[0].groupId : createGroup(null, [friend.id]);
            })
            .then(groupId => groupId ? router.push(`/chat/${groupId}`) : toast.error(t('error', 'Something went wrong')))
            .finally(() => setBusyId(null));
    };

    return (
        <section className='friends-panel' data-open={open}>
            <button type='button'
                    className='friends-header'
                    aria-expanded={open}
                    onClick={() => setOpen(value => !value)}>
                <span className='friends-title'>{t('friends', 'Friends')}</span>
                <span className='friends-count'>{friends.length}</span>
                <FontAwesomeIcon className='friends-chevron' icon={faChevronUp} aria-hidden/>
            </button>

            {open && <>
                <div className='friends-add'>
                    <Dropdown value={candidate}
                              options={candidates}
                              onChange={(event) => setCandidate(event.value)}
                              filter
                              placeholder={t('find_people', 'Find people')}
                              aria-label={t('find_people', 'Find people')}
                              emptyMessage={t('no_people', 'No one left to add')}
                              emptyFilterMessage={t('no_matches', 'No matches')}/>
                    {/* Icon alone: the dock is as narrow as the dashboard rail, and the
                        dropdown beside it needs every pixel of that. */}
                    <button type='button'
                            className='friends-add-button'
                            onClick={add}
                            disabled={!candidate || busyId === candidate}
                            aria-label={t('add_friend', 'Add friend')}
                            data-tooltip={t('add_friend', 'Add friend')}>
                        <FontAwesomeIcon icon={faUserPlus}/>
                    </button>
                </div>

                {friends.length ? (
                    <ul className='friends-list'>
                        {friends.map(friend => (
                            <li key={friend.id} className='friends-item'>
                                <span className='friends-face'>
                                    <Avatar name={friend.displayName} photo={friend.photo}/>
                                    <span className='presence-dot' data-online={online.has(friend.id) || undefined}
                                          data-busy={online.get(friend.id) ? 'true' : undefined}
                                          aria-label={online.get(friend.id) ? t('presence_playing', 'In a match')
                                              : online.has(friend.id) ? t('presence_online', 'Online') : t('presence_offline', 'Offline')}/>
                                </span>
                                <Link href={`/profile/${friend.id}`} className='friends-name'>{friend.displayName}</Link>
                                {online.has(friend.id) && !online.get(friend.id) && (
                                    <button type='button'
                                            className='friends-action friends-action-duel'
                                            onClick={() => duel(friend)}
                                            disabled={busyId === friend.id}
                                            aria-label={t('duel_with', 'Duel {{name}}', {name: friend.displayName})}
                                            data-tooltip={t('live_duel', 'Duel a friend')}>
                                        <FontAwesomeIcon icon={faBolt}/>
                                    </button>
                                )}
                                <button type='button'
                                        className='friends-action'
                                        onClick={() => chat(friend)}
                                        disabled={busyId === friend.id}
                                        aria-label={t('chat_with', 'Chat with {{name}}', {name: friend.displayName})}
                                        data-tooltip={t('chat', 'Chat')}>
                                    <FontAwesomeIcon icon={faComments}/>
                                </button>
                                <button type='button'
                                        className='friends-action friends-action-danger'
                                        onClick={() => setPendingRemoval(friend)}
                                        disabled={busyId === friend.id}
                                        aria-label={t('remove_friend', 'Remove {{name}}', {name: friend.displayName})}
                                        data-tooltip={t('remove', 'Remove')}>
                                    <FontAwesomeIcon icon={faUserMinus}/>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className='friends-empty'>{t('no_friends', 'No friends yet. Find someone above.')}</p>
                )}
            </>}

            <ConfirmDialog open={Boolean(pendingRemoval)}
                           danger
                           busy={Boolean(pendingRemoval) && busyId === pendingRemoval.id}
                           title={t('remove_friend_title', 'Remove friend?')}
                           message={pendingRemoval && t('remove_friend_confirm',
                               '{{name}} will be removed from your friends, and you from theirs.',
                               {name: pendingRemoval.displayName})}
                           confirmLabel={t('remove', 'Remove')}
                           onConfirm={confirmRemove}
                           onCancel={() => setPendingRemoval(null)}/>
        </section>
    );
};
