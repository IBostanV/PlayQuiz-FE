import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import SockJsClient from 'react-stomp';
import {useRouter} from 'next/router';
import {toast} from 'react-toastify';
import {useTranslation} from 'react-i18next';
import {getCurrentUser} from '../api/user';
import {getMutedGroups, setGroupMuted} from '../api/user/group-mute';
import {readChallenge, readResult} from '../utils/quizMessage';
import {declineRoom, LIVE_TOPIC} from '../api/live';

// Defaults (outside the provider) carry the real signatures, so TS callers type-check.
const ChatNotificationsContext = createContext({
    isMuted: (groupId) => false,
    toggleMute: (groupId) => Promise.resolve(),
    desktopPermission: 'unsupported',
    enableDesktopNotifications: () => Promise.resolve(),
    connected: false,
    sendMessage: (destination, body) => {},
    subscribe: (listener) => () => {},
});

export const useChatNotifications = () => useContext(ChatNotificationsContext);

const PREVIEW_LENGTH = 80;
const preview = (html = '') => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text;
};

const PRIVATE_TOPIC = '/user/solo';
const PUBLIC_TOPIC = '/party/news';

// The app's one chat socket, plus notifications. While logged in it holds the only STOMP
// connection: the chat page reads `connected`, sends through `sendMessage` and gets messages
// through `subscribe` instead of opening a socket of its own.
//
// Private group messages also raise a notification, except:
//   - the user's own messages (the server echoes them back to every member),
//   - messages for the chat that is open in the visible tab (the chat page shows them live),
//   - groups the user muted (Q_USER_GROUP.MUTED, per member).
// Muting only silences notifications; the chat page still receives muted groups' messages.
// With the tab in the background and permission granted, a desktop notification replaces the toast.
export const ChatNotificationsProvider = ({isLoggedIn, children}) => {
    const router = useRouter();
    const {t} = useTranslation();
    const [muted, setMuted] = useState(new Set());
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
        if (!isLoggedIn) {
            setMuted(new Set());
            setCurrentUser(null);
            // The client just unmounts on logout; onDisconnect is not guaranteed to fire.
            setConnected(false);
            return;
        }
        getMutedGroups().then(ids => setMuted(new Set((ids ?? []).map(String))));
        getCurrentUser().then(setCurrentUser);
    }, [isLoggedIn]);

    const isMuted = (groupId) => muted.has(String(groupId));

    // Optimistic: the bell flips at once and flips back if the server refuses.
    const toggleMute = (groupId) => {
        const id = String(groupId);
        const nextMuted = !muted.has(id);
        const apply = (value) => setMuted(current => {
            const next = new Set(current);
            value ? next.add(id) : next.delete(id);
            return next;
        });

        apply(nextMuted);
        return setGroupMuted(id, nextMuted).then(response => {
            if (!response) apply(!nextMuted);
        });
    };

    // Desktop notifications need the user's permission, and browsers only let a click ask for
    // it, so the chat page offers a button while this is still 'default'.
    const [desktopPermission, setDesktopPermission] = useState('unsupported');

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setDesktopPermission(Notification.permission);
        }
    }, []);

    const enableDesktopNotifications = () =>
        Notification.requestPermission().then(setDesktopPermission);

    // Tab in the background + permission granted: a system notification; clicking it brings
    // the tab forward on that chat. Same tag per group, so a burst replaces rather than piles up.
    const notifyDesktop = (groupId, title, body) => {
        const notification = new Notification(title, {
            body,
            tag: `chat-${groupId}`,
            icon: '/resources/favicon.png',
        });
        notification.onclick = () => {
            window.focus();
            router.push(`/chat/${groupId}`);
            notification.close();
        };
    };

    // ---- Socket -----------------------------------------------------------------------------

    const clientRef = useRef(null);
    const listenersRef = useRef(new Set());
    const [connected, setConnected] = useState(false);

    const sendMessage = useCallback((destination, body) => clientRef.current?.sendMessage(destination, body), []);

    // Returns the unsubscribe function, so a component can hand it straight back to useEffect.
    const subscribe = useCallback((listener) => {
        listenersRef.current.add(listener);
        return () => {
            listenersRef.current.delete(listener);
        };
    }, []);

    // Every push reaches the listeners (the chat page applies edits and deletions too), but only
    // a new message notifies: an EDITED or DELETED event is not news.
    const onMessage = (message, topic) => {
        listenersRef.current.forEach(listener => listener(message, topic));
        if (topic === LIVE_TOPIC) {
            onLive(message);
            return;
        }
        const isNew = !message.event || message.event === 'CREATED';
        if (topic === PRIVATE_TOPIC && isNew) notify(message);
    };

    // ---- Live matches -----------------------------------------------------------------------

    // An invitation to a duel or a room reaches whatever page the player is on, as a toast that
    // stays until it is answered; the room going away before then takes the toast with it. The
    // room's own page follows the match itself, through subscribe.
    const onLive = (event) => {
        const toastId = `live-${event.code}`;
        if (event.type === 'CLOSED') {
            toast.dismiss(toastId);
            return;
        }
        if (event.type !== 'INVITE' || toast.isActive(toastId)) return;

        const join = () => {
            toast.dismiss(toastId);
            router.push(`/live/${event.code}?join=1`);
        };
        const decline = () => {
            toast.dismiss(toastId);
            declineRoom(event.code);
        };
        toast.info((
            <div className='live-invite'>
                <strong>{event.from?.displayName}</strong>
                <span>
                    {event.mode === 'DUEL'
                        ? t('live_invite_duel', 'challenges you to a live duel')
                        : t('live_invite_room', 'invites you to a live quiz room')}
                </span>
                <span className='live-invite-actions'>
                    <button type='button' className='live-invite-join' onClick={join}>{t('join', 'Join')}</button>
                    <button type='button' className='live-invite-decline' onClick={decline}>{t('decline', 'No thanks')}</button>
                </span>
            </div>
        ), {toastId, autoClose: false, closeOnClick: false, icon: false});
    };

    // ---- Notifications ----------------------------------------------------------------------

    const notify = (message) => {
        const groupId = String(message.destinationId);
        const hidden = document.hidden;
        // The author comes as an account id; the server never sends their email.
        const own = currentUser && message.participantId === currentUser.id;
        // An open chat in a background tab is not being read, so it still notifies.
        const viewing = !hidden && router.pathname === '/chat/[chatId]' && String(router.query.chatId) === groupId;
        if (own || viewing || muted.has(groupId)) return;

        const sender = message.participantUsername;
        // A sent question announces itself; an answer to one never shows its text, which would
        // give the question away before the reader has answered it (see components/chat/quiz-message).
        const text = readResult(message.content)
            ? t('quiz_answered', 'answered a question')
            : readChallenge(message.content)
                ? t('quiz_sent_you_a_question', 'sent a question')
                : preview(message.content) || t('new_message', 'New message');

        if (hidden && desktopPermission === 'granted') {
            notifyDesktop(groupId, sender, text);
            return;
        }

        const content = (
            <div className='chat-notification'>
                <strong>{sender}</strong>
                <span>{text}</span>
            </div>
        );

        // One toast per group: a burst of messages shows the latest instead of stacking.
        const toastId = `chat-${groupId}`;
        if (toast.isActive(toastId)) {
            toast.update(toastId, {render: content});
        } else {
            toast.info(content, {
                toastId,
                onClick: () => router.push(`/chat/${groupId}`),
                icon: false,
            });
        }
    };

    return (
        <ChatNotificationsContext.Provider value={{
            isMuted, toggleMute, desktopPermission, enableDesktopNotifications,
            connected, sendMessage, subscribe,
        }}>
            {children}
            {/* Mounted per login: logging out tears the connection down, logging in opens a
                fresh one under the new session. */}
            {isLoggedIn && (
                <SockJsClient ref={clientRef}
                              url={`${process.env.NEXT_PUBLIC_BE_HOST_URL}/api/pq`}
                              topics={[PRIVATE_TOPIC, PUBLIC_TOPIC, LIVE_TOPIC]}
                              onConnect={() => setConnected(true)}
                              onDisconnect={() => setConnected(false)}
                              onMessage={onMessage}/>
            )}
        </ChatNotificationsContext.Provider>
    );
};
