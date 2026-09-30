import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faHandFist, faUserGroup} from '@fortawesome/free-solid-svg-icons';
import getFriends from '../../api/user/get-friends';
import {sendChallenge} from '../../api/social';
import {Popup} from '../common/popup';
import {Avatar} from '../common/avatar';

// "Beat my score": the button under a finished quiz, and the list of friends to send it to. The
// friends get the very same questions; their score shows beside this one when they have played.
export const ChallengeFriends = ({historyId}) => {
    const {t} = useTranslation();
    const [open, setOpen] = useState(false);
    const [friends, setFriends] = useState(null);
    const [picked, setPicked] = useState(new Set());
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (open && friends === null) getFriends().then(list => setFriends(Array.isArray(list) ? list : []));
    }, [open]);

    const toggle = (id) => setPicked(current => {
        const next = new Set(current);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const send = () => {
        setBusy(true);
        sendChallenge(Number(historyId), [...picked])
            .then(sent => {
                if (!sent) return;
                toast.success(t('challenge_sent', 'Challenge sent'));
                setOpen(false);
                setPicked(new Set());
            })
            .finally(() => setBusy(false));
    };

    return (
        <>
            <button type='button' className='result-challenge' onClick={() => setOpen(true)}>
                <FontAwesomeIcon icon={faHandFist}/>
                <span>{t('challenge_friends', 'Challenge friends')}</span>
            </button>

            <Popup open={open} icon={faHandFist} title={t('challenge_friends', 'Challenge friends')} busy={busy}
                   onClose={() => setOpen(false)}>
                <p className='popup-message'>
                    {t('challenge_friends_hint', 'They get the same questions. Whoever gets more right wins; the faster one if it is a tie.')}
                </p>

                {friends === null ? (
                    <div className='quiz-loading' aria-label={t('loading', 'Loading')}/>
                ) : friends.length === 0 ? (
                    <p className='challenge-empty'>
                        <FontAwesomeIcon icon={faUserGroup}/> {t('challenge_no_friends', 'Add some friends first, from the friends panel.')}
                    </p>
                ) : (
                    <ul className='challenge-pick'>
                        {friends.map(friend => (
                            <li key={friend.id}>
                                <label className='challenge-pick-row' data-picked={picked.has(friend.id) || undefined}>
                                    <input type='checkbox' className='visually-hidden' checked={picked.has(friend.id)}
                                           onChange={() => toggle(friend.id)}/>
                                    <Avatar name={friend.displayName} photo={friend.photo} className='challenge-pick-avatar'/>
                                    <span className='challenge-pick-name'>{friend.displayName}</span>
                                    <span className='challenge-pick-check' aria-hidden><FontAwesomeIcon icon={faCheck}/></span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}

                <div className='popup-actions'>
                    <button type='button' className='popup-cancel' onClick={() => setOpen(false)} disabled={busy}>
                        {t('cancel', 'Cancel')}
                    </button>
                    <button type='button' className='popup-confirm' onClick={send} disabled={busy || picked.size === 0}>
                        {t('challenge_send', 'Send challenge')}
                    </button>
                </div>
            </Popup>
        </>
    );
};

ChallengeFriends.propTypes = {
    historyId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
