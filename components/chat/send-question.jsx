import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPaperPlane} from '@fortawesome/free-solid-svg-icons';
import {Popup} from '../common/popup';
import {Avatar} from '../common/avatar';
import getUserGroups from '../../api/user/getUserGroups';
import {groupTitle, toGroups} from '../../utils/groups';
import getQuestionWithOptions from '../../api/question/get-with-options';
import {useChatNotifications} from '../../context/chat-notifications';
import {challengeMessage} from '../../utils/quizMessage';

/**
 * "Send to a chat" on a quiz question: picks one of the player's chats and posts the question
 * with the options they are looking at, as a card the others answer in place
 * (components/chat/quiz-message). Renders nothing while the chat socket is down — logged out,
 * there is nowhere to send it.
 *
 * `question` is the whole question, `{id, content, answers}`. Where the caller has no options to
 * hand (the result page reads back a finished quiz), they are fetched when the picker opens.
 */
export const SendQuestion = ({question, label = true}) => {
    const {t} = useTranslation();
    const {connected, sendMessage} = useChatNotifications();
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState(null);
    const [loaded, setLoaded] = useState(null);

    // Only once the picker opens: most players never send a question.
    useEffect(() => {
        if (!open) return;
        getUserGroups().then(rows => setGroups(toGroups(rows)));
        if (!question?.answers?.length) {
            getQuestionWithOptions(question.id).then(found => setLoaded(found?.id ? found : null));
        }
    }, [open]);

    if (!connected || !question?.id) return null;

    const send = (group) => {
        sendMessage('/api/app/private', JSON.stringify({
            content: challengeMessage(question.answers?.length ? question : (loaded ?? question)),
            destinationId: group.groupId,
        }));
        setOpen(false);
        toast.success(t('question_sent', 'Question sent to {{name}}', {name: groupTitle(group, t('chat'))}));
    };

    return (
        <>
            <button type='button' className='quiz-send' aria-haspopup='dialog' onClick={() => setOpen(true)}
                    data-tooltip={t('send_question', 'Send this question to a chat')}
                    aria-label={t('send_question', 'Send this question to a chat')}>
                <FontAwesomeIcon icon={faPaperPlane}/>
                {label && <span>{t('send_to_chat', 'Send to a chat')}</span>}
            </button>

            <Popup open={open} icon={faPaperPlane} title={t('send_question', 'Send this question to a chat')}
                   onClose={() => setOpen(false)}>
                <p className='send-question-text'>“{question.content}”</p>
                {groups === null ? (
                    <div className='mini-quiz-loading' aria-label={t('loading', 'Loading')}/>
                ) : groups.length ? (
                    <ul className='send-question-groups'>
                        {groups.map(group => {
                            const title = groupTitle(group, t('no_username'));
                            return (
                                <li key={group.groupId}>
                                    <button type='button' className='send-question-group' onClick={() => send(group)}>
                                        <Avatar name={title} photo={group.photo}/>
                                        <span>{title}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className='send-question-empty'>
                        {t('no_chats_yet', 'No chats yet — start one to send a question.')}
                    </p>
                )}
            </Popup>
        </>
    );
};
