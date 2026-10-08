import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {faBullhorn} from '@fortawesome/free-solid-svg-icons';
import {Popup} from '../common/popup';
import {ANNOUNCEMENT_TOPIC, getUnseenAnnouncements, markAnnouncementSeen} from '../../api/announcement';
import {useChatNotifications} from '../../context/chat-notifications';
import {QUIZ_ENDED, quizInProgress} from '../../utils/quiz-in-progress';

// What an admin announced, shown one at a time over whatever page the player is on. Never in the
// middle of a quiz: it waits for the quiz to end (QUIZ_ENDED), then shows.
//
// No polling: a new one arrives over the app's socket. What was sent while the player had no
// socket is read from the server each time it (re)connects.
export const Announcements = () => {
    const {t} = useTranslation();
    const {connected, subscribe, currentUser} = useChatNotifications();
    const [pending, setPending] = useState([]);
    // Bumped when a quiz ends, to look again at whether one is running.
    const [, recheck] = useState(0);

    useEffect(() => {
        if (connected) getUnseenAnnouncements().then(found => found && setPending(found));
    }, [connected]);

    useEffect(() => subscribe((announcement, topic) => {
        // The admin who sent it knows what it says (the server marks it seen for them, too).
        if (topic !== ANNOUNCEMENT_TOPIC || announcement.createdBy === currentUser?.id) return;
        setPending(list => (list.some(seen => seen.announcementId === announcement.announcementId)
            ? list : [...list, announcement]));
    }), [subscribe, currentUser]);

    useEffect(() => {
        const ended = () => recheck(count => count + 1);
        window.addEventListener(QUIZ_ENDED, ended);
        return () => window.removeEventListener(QUIZ_ENDED, ended);
    }, []);

    const shown = quizInProgress() ? null : pending[0];

    const dismiss = () => {
        markAnnouncementSeen(shown.announcementId);
        setPending(list => list.slice(1));
    };

    return (
        <Popup open={Boolean(shown)} icon={faBullhorn} title={shown?.title} onClose={dismiss}>
            {shown?.content && <p className='popup-message announcement-text'>{shown.content}</p>}
            <div className='popup-actions'>
                <button type='button' className='popup-confirm' onClick={dismiss}>{t('got_it', 'Got it')}</button>
            </div>
        </Popup>
    );
};
