import React, {useEffect, useRef, useState} from 'react';
import fetchMessages from '../../api/message';
import {useTranslation} from "react-i18next";
import {getCurrentUser} from "../../api/user";
import {Editor} from "primereact/editor";
import Link from "next/link";
import {useRouter} from "next/router";
import getUserGroups from "../../api/user/getUserGroups";
import {CreateGroup} from "../../components/chat/create-group";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBell, faBellSlash, faCamera, faCheck, faDesktop, faPaperPlane, faPen, faPlus, faTrashCan, faUsers, faXmark
} from "@fortawesome/free-solid-svg-icons";
import {useChatNotifications} from "../../context/chat-notifications";
import {toast} from "react-toastify";
import {Avatar} from "../../components/common/avatar";
import {setGroupPhoto} from "../../api/user/group-photo";
import {ConfirmDialog, Popup} from "../../components/common/popup";
import {GroupLeaderboard} from "../../components/social/group-leaderboard";
import deleteGroup from "../../api/user/delete-group";
import {deleteMessage, editMessage} from "../../api/message/manage";
import {groupTitle, toGroups} from "../../utils/groups";
import {QuizMessage, QuizResultMessage} from "../../components/chat/quiz-message";
import {readChallenge, readResult, resultMessage, stripMarkers} from "../../utils/quizMessage";
import {toDate} from "../../utils/toDate";

// Quill leaves "<p><br></p>" behind in an empty editor.
const isBlank = (html) => !html || !html.replace(/<[^>]*>/g, '').trim();

// A run of messages breaks after this long, so a reply hours or days later keeps its own header.
const RUN_GAP_MS = 5 * 60 * 1000;
const withinRun = (before, after) => {
  const start = toDate(before), end = toDate(after);
  // A timestamp with no reading: group on the author alone rather than never.
  return !start || !end || end.getTime() - start.getTime() < RUN_GAP_MS;
};

function Message() {
  const router = useRouter();
  const { chatId } = router.query;
  const {t, i18n} = useTranslation();

  // The day a message was sent, for the dividers between runs. '' when it cannot be parsed,
  // so an unreadable timestamp shows nothing rather than "Invalid Date".
  const dayLabel = (value) => {
    const date = toDate(value);
    return date
        ? date.toLocaleDateString(i18n.language, {day: 'numeric', month: 'short', year: 'numeric'})
        : '';
  };

  const [input, setInput] = useState('');
  const [groups, setGroups] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showingParticipants, setShowingParticipants] = useState(false);
  // The app-wide socket (context/chat-notifications): this page opens no connection of its own.
  const {
    isMuted, toggleMute, desktopPermission, enableDesktopNotifications,
    connected, sendMessage, subscribe,
  } = useChatNotifications();
  const [deleting, setDeleting] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Shown to every member, so the list is reloaded once it is saved. No file clears the picture.
  const saveGroupPhoto = (file?: File) => {
    if (!chatId) return;
    setSavingPhoto(true);
    setGroupPhoto(String(chatId), file)
      .then(response => response && getUserGroups().then(rows => setGroups(toGroups(rows))))
      .finally(() => setSavingPhoto(false));
  };
  const threadRef = useRef(null);

  useEffect(() => {
    getCurrentUser().then(setCurrentUser);
  }, []);

  // Per chat, so a group just created (which navigates here) shows up and its form closes.
  useEffect(() => {
    getUserGroups().then(rows => setGroups(toGroups(rows)));
    setCreating(false);
  }, [chatId]);

  // Reload history whenever the open chat changes, not only on the first socket connect,
  // so switching groups in the sidebar does not keep the previous group's messages.
  useEffect(() => {
    if (!connected || !chatId) return;
    fetchMessages('/api/message', chatId).then(response => setMessages(response ?? []));
  }, [connected, chatId]);

  // Follow the conversation: new messages scroll into view. Only when the list grows, so an
  // edit or delete further up does not yank someone reading history back to the bottom.
  const messageCount = useRef(0);
  useEffect(() => {
    if (messages.length > messageCount.current) {
      threadRef.current?.scrollTo({top: threadRef.current.scrollHeight, behavior: 'smooth'});
    }
    messageCount.current = messages.length;
  }, [messages]);

  // The socket delivers messages for every group the user is in; keep only this one's.
  // Re-subscribed per chat so the listener always compares against the open chatId.
  // A push is a new message, or an EDITED / DELETED event for one already on screen.
  useEffect(() => subscribe((message) => {
    if (String(message.destinationId) !== String(chatId)) return;
    if (message.event === 'EDITED') {
      setMessages(list => list.map(item => item.messageId === message.messageId ? { ...item, ...message } : item));
    } else if (message.event === 'DELETED') {
      setMessages(list => list.filter(item => item.messageId !== message.messageId));
    } else {
      setMessages(list => [...list, message]);
    }
  }), [subscribe, chatId]);

  // Editing reuses the composer: the message's text is loaded into it, Send becomes Save, and
  // Cancel (or Esc) puts it back to writing a new message.
  const [editingMessage, setEditingMessage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (message) => {
    setEditingMessage(message);
    setInput(message.content ?? '');
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInput('');
  };

  // Switching chats drops an edit in progress.
  useEffect(() => {
    setEditingMessage(null);
  }, [chatId]);

  const saveEdit = () => {
    const message = editingMessage;
    setSavingEdit(true);
    editMessage(message.messageId, input)
      .then(response => {
        if (!response) return;
        // The socket brings the same change to everyone; apply it here too so it shows at once.
        setMessages(list => list.map(item => item.messageId === message.messageId ? { ...item, ...response.data } : item));
        cancelEdit();
      })
      .finally(() => setSavingEdit(false));
  };

  const sendPrivateMessage = () => {
    if (isBlank(input)) return;
    if (editingMessage) {
      saveEdit();
      return;
    }
    sendMessage('/api/app/private', JSON.stringify({
      content: input,
      destinationId: chatId
    }));
    setInput('');
  };

  // Ctrl/Cmd + Enter sends (or saves an edit); plain Enter keeps adding lines; Esc cancels an edit.
  const onComposerKeyDown = (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      sendPrivateMessage();
    } else if (event.key === 'Escape' && editingMessage) {
      event.preventDefault();
      cancelEdit();
    }
  };

  // The trash on a message opens the confirm; its button deletes (for everyone, via the socket).
  const [pendingMessageDelete, setPendingMessageDelete] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);

  const confirmMessageDelete = () => {
    const message = pendingMessageDelete;
    setDeletingMessage(true);
    deleteMessage(message.messageId)
      .then(response => {
        if (!response) return;
        setMessages(list => list.filter(item => item.messageId !== message.messageId));
        if (editingMessage?.messageId === message.messageId) cancelEdit();
      })
      .finally(() => {
        setDeletingMessage(false);
        setPendingMessageDelete(null);
      });
  };

  // The header's trash button only opens the popup; its confirm deletes. Afterwards the next
  // remaining group opens, or /chat, which shows the no-groups welcome when none are left.
  const confirmDeleteGroup = () => {
    setDeleting(true);
    deleteGroup(chatId as string)
        .then(response => {
          if (!response) return;
          toast.success(t('group_deleted', 'Group deleted'));
          const next = groups.find(group => String(group.groupId) !== String(chatId));
          return router.push(next ? `/chat/${next.groupId}` : '/chat');
        })
        .finally(() => {
          setDeleting(false);
          setConfirmingDelete(false);
        });
  };

  const activeGroup = groups.find(group => String(group.groupId) === String(chatId));
  // The author comes as an account id; the server never sends their email.
  const isOwn = (message) => currentUser && message.participantId === currentUser.id;

  // Answering a question someone sent here: the verdict goes back as its own message, so it is
  // kept in this chat and nowhere else. Everyone in the group sees it, as with any message.
  const sendAnswer = (questionId, verdict, option) => {
    sendMessage('/api/app/private', JSON.stringify({
      content: resultMessage(questionId, verdict.correct, option.content),
      destinationId: chatId,
    }));
  };

  // The verdict this user already posted for a question, which keeps its card locked after a
  // reload. A question sent twice into the same chat is answered once.
  const myVerdictFor = (questionId) => {
    const answer = messages.find(item => isOwn(item) && readResult(item.content)?.id === questionId);
    return answer ? readResult(answer.content) : null;
  };

  // Someone else's answer gives the question away, so it stays covered until this user has
  // answered it too — or sent it, since the sender is never allowed to answer their own.
  const canSeeAnswer = (questionId, message) => isOwn(message)
      || Boolean(myVerdictFor(questionId))
      || messages.some(item => isOwn(item) && readChallenge(item.content)?.id === questionId);

  return (
    <div className='chat-page'>
      <aside className='chat-sidebar'>
        <h2 className='chat-sidebar-title'>{t('chat')}</h2>
        <nav className='chat-groups'>
          {groups.map(group => {
            const title = groupTitle(group, t('no_username'));
            return (
              <Link key={group.groupId}
                    href={`/chat/${group.groupId}`}
                    className='chat-group'
                    aria-current={group === activeGroup ? 'page' : undefined}>
                <Avatar name={title} photo={group.photo}/>
                <span className='chat-group-text'>
                  <span className='chat-group-name'>{title}</span>
                  {group.name && group.members.length > 0 &&
                      <span className='chat-group-members'>{group.members.join(', ')}</span>}
                </span>
                {isMuted(group.groupId) && (
                    <span className='chat-group-muted' data-tooltip={t('muted', 'Muted')}>
                      <FontAwesomeIcon icon={faBellSlash}/>
                      <span className='visually-hidden'>{t('muted', 'Muted')}</span>
                    </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className='chat-create'>
          {/* Only while the browser has not asked yet; after allow or block there is nothing to offer. */}
          {desktopPermission === 'default' && (
              <button type='button' className='chat-desktop-toggle' onClick={enableDesktopNotifications}
                      data-tooltip={t('desktop_notifications_hint', 'Get a system notification for new messages while this tab is in the background')}>
                <FontAwesomeIcon icon={faDesktop}/>
                {t('enable_desktop_notifications', 'Enable desktop notifications')}
              </button>
          )}
          <button type='button'
                  className='chat-create-toggle'
                  aria-haspopup='dialog'
                  onClick={() => setCreating(true)}>
            <FontAwesomeIcon icon={faPlus}/>
            {t('create_group', 'Create group')}
          </button>
        </div>
        {/* Creating navigates to the new chat, and the chatId effect closes this. */}
        <Popup open={creating}
               icon={faUsers}
               title={t('create_group', 'Create group')}
               onClose={() => setCreating(false)}>
          <CreateGroup onCancel={() => setCreating(false)}/>
        </Popup>
      </aside>

      <section className='chat-main'>
        <header className='chat-header'>
          {/* The picture is the group's, so any member may change it. */}
          <label className='chat-header-photo' data-tooltip={t('set_group_photo', 'Set a group photo')}>
            <Avatar name={groupTitle(activeGroup, '#')} photo={activeGroup?.photo}/>
            <span className='chat-header-photo-mark' aria-hidden><FontAwesomeIcon icon={faCamera}/></span>
            <span className='visually-hidden'>{t('set_group_photo', 'Set a group photo')}</span>
            <input type='file' accept='image/*' className='visually-hidden' disabled={!activeGroup || savingPhoto}
                   onChange={(event) => event.target.files?.[0] && saveGroupPhoto(event.target.files[0])}/>
          </label>
          {activeGroup?.photo && (
              <button type='button'
                      className='chat-header-photo-remove'
                      onClick={() => saveGroupPhoto()}
                      disabled={savingPhoto}
                      aria-label={t('remove_group_photo', 'Remove the group photo')}
                      data-tooltip={t('remove_group_photo', 'Remove the group photo')}>
                <FontAwesomeIcon icon={faXmark}/>
              </button>
          )}
          <div className='chat-header-text'>
            <h1 className='chat-header-title'>{groupTitle(activeGroup, t('chat'))}</h1>
            <span className='chat-header-status' data-online={connected}>
              {connected ? t('connected', 'Connected') : t('connecting', 'Connecting…')}
            </span>
          </div>
          {activeGroup && (
              <button type='button'
                      className='friends-action'
                      onClick={() => setShowingParticipants(true)}
                      aria-haspopup='dialog'
                      aria-label={t('participants', 'Participants')}
                      data-tooltip={t('participants', 'Participants')}>
                <FontAwesomeIcon icon={faUsers}/>
                <span className='chat-participants-count'>
                  {(activeGroup.participants?.length ?? 0) + 1}
                </span>
              </button>
          )}
          {activeGroup && <GroupLeaderboard groupId={activeGroup.groupId}/>}
          {activeGroup && (
              <button type='button'
                      className='friends-action chat-mute'
                      onClick={() => toggleMute(activeGroup.groupId)}
                      aria-pressed={isMuted(activeGroup.groupId)}
                      aria-label={t('mute_group', 'Mute notifications')}
                      data-tooltip={isMuted(activeGroup.groupId)
                          ? t('unmute_group', 'Muted — click to get notifications again')
                          : t('mute_group', 'Mute notifications')}>
                <FontAwesomeIcon icon={isMuted(activeGroup.groupId) ? faBellSlash : faBell}/>
              </button>
          )}
          {activeGroup && (
              <button type='button'
                      className='friends-action friends-action-danger'
                      onClick={() => setConfirmingDelete(true)}
                      aria-haspopup='dialog'
                      aria-label={t('delete_group', 'Delete group')}
                      data-tooltip={t('delete_group', 'Delete group')}>
                <FontAwesomeIcon icon={faTrashCan}/>
              </button>
          )}
        </header>
        {/* Everyone in this chat. The rows name the other members; the signed-in player is
            added here because the server sends a chat's *other* members, never themselves. */}
        <Popup open={showingParticipants}
               icon={faUsers}
               title={t('participants', 'Participants')}
               onClose={() => setShowingParticipants(false)}>
          <ul className='chat-participants'>
            <li className='chat-participant'>
              <Avatar name={currentUser?.username || '?'} photo={currentUser?.avatar}/>
              <span className='chat-participant-name'>
                {currentUser?.username || t('no_username', 'No username')}
              </span>
              <span className='chat-participant-you'>{t('you', 'You')}</span>
            </li>
            {(activeGroup?.participants ?? []).map(participant => (
                <li key={participant.id} className='chat-participant'>
                  <Avatar name={participant.username || '?'}/>
                  <Link href={`/profile/${participant.id}`} className='chat-participant-name'>
                    {participant.username || t('no_username', 'No username')}
                  </Link>
                </li>
            ))}
          </ul>
        </Popup>

        <ConfirmDialog open={confirmingDelete}
                       danger
                       busy={deleting}
                       title={t('delete_group_title', 'Delete group?')}
                       message={t('delete_group_confirm',
                           '"{{name}}" and all its messages will be deleted for every member. This can’t be undone.',
                           {name: groupTitle(activeGroup, t('chat'))})}
                       confirmLabel={t('delete', 'Delete')}
                       onConfirm={confirmDeleteGroup}
                       onCancel={() => setConfirmingDelete(false)}/>

        <div className='chat-thread' ref={threadRef}>
          {connected && !messages.length && (
              <p className='chat-empty'>{t('no_messages', 'No messages yet. Say hi!')}</p>
          )}
          {messages.map((message, index) => {
            // A run by the same author reads as one block: only its first message keeps the
            // author and time; the rest hide them and their buttons float over the bubble.
            const previous = messages[index - 1];
            const grouped = !!previous && previous.participantId === message.participantId
                && withinRun(previous.createdDate, message.createdDate);
            // Empty for a timestamp this browser cannot read, which then gets no divider.
            const day = dayLabel(message.createdDate);
            // A sent question and an answer to one are plain messages carrying a marker; both
            // render as cards instead of their raw HTML (utils/quizMessage).
            const challenge = readChallenge(message.content);
            const answer = readResult(message.content);
            return (
              <React.Fragment key={message.messageId ?? index}>
              {day && day !== dayLabel(previous?.createdDate) && (
                  <p className='chat-day'>{day}</p>
              )}
              <article className='chat-message'
                       data-own={isOwn(message)} data-grouped={grouped}>
                <header className='chat-message-meta'>
                  {/* participantId is the author's account (the server fills it in), so the name
                      opens their profile. */}
                  {!isOwn(message) && message.participantId ? (
                    <Link href={`/profile/${message.participantId}`} className='chat-message-author'>
                      {message.participantUsername}
                    </Link>
                  ) : (
                    <span className='chat-message-author'>
                      {isOwn(message) ? t('you', 'You') : message.participantUsername}
                    </span>
                  )}
                  <time>{message.createdDate}</time>
                  {message.edited && <span className='chat-message-edited'>{t('edited', 'edited')}</span>}
                </header>
                {/* Beside the bubble, on every own message (the server refuses anyone else's).
                    Needs the id, which every message now carries, live ones included. */}
                {isOwn(message) && message.messageId && (
                  <span className='chat-message-actions'>
                    <button type='button' onClick={() => startEdit(message)}
                            aria-label={t('edit_message', 'Edit message')} data-tooltip={t('edit', 'Edit')}>
                      <FontAwesomeIcon icon={faPen}/>
                    </button>
                    <button type='button' data-danger='true' onClick={() => setPendingMessageDelete(message)}
                            aria-haspopup='dialog'
                            aria-label={t('delete_message', 'Delete message')} data-tooltip={t('delete', 'Delete')}>
                      <FontAwesomeIcon icon={faTrashCan}/>
                    </button>
                  </span>
                )}
                {challenge ? (
                  <div className='chat-message-body' data-card='quiz'>
                    <QuizMessage question={challenge}
                                 mine={isOwn(message)}
                                 answered={myVerdictFor(challenge.id)}
                                 onAnswer={(verdict, option) => sendAnswer(challenge.id, verdict, option)}/>
                  </div>
                ) : answer ? (
                  <div className='chat-message-body' data-card='quiz'>
                    <QuizResultMessage correct={answer.correct} answer={answer.answer}
                                       covered={!canSeeAnswer(answer.id, message)}/>
                  </div>
                ) : (
                  <div className='chat-message-body'
                       data-editing={editingMessage?.messageId === message.messageId}
                       dangerouslySetInnerHTML={{ __html: stripMarkers(message.content) }} />
                )}
              </article>
              </React.Fragment>
            );
          })}
        </div>

        {editingMessage && (
          <div className='chat-editing-bar'>
            <FontAwesomeIcon icon={faPen}/>
            <span>{t('editing_message', 'Editing message')}</span>
            <button type='button' onClick={cancelEdit}>{t('cancel', 'Cancel')} <kbd>Esc</kbd></button>
          </div>
        )}
        <div className='chat-composer' onKeyDown={onComposerKeyDown} data-editing={Boolean(editingMessage)}>
          <Editor value={input} onTextChange={(e) => setInput(e.htmlValue ?? '')}/>
          <button type='button'
                  className='chat-send'
                  onClick={sendPrivateMessage}
                  disabled={!connected || isBlank(input) || savingEdit}
                  data-tooltip={`${editingMessage ? t('save', 'Save') : t('send')} (Ctrl+Enter)`}>
            <FontAwesomeIcon icon={editingMessage ? faCheck : faPaperPlane}/>
            <span>{editingMessage ? t('save', 'Save') : t('send')}</span>
          </button>
        </div>
        <ConfirmDialog open={Boolean(pendingMessageDelete)}
                       danger
                       busy={deletingMessage}
                       title={t('delete_message_title', 'Delete message?')}
                       message={t('delete_message_confirm', 'It will be removed for everyone in this chat.')}
                       confirmLabel={t('delete', 'Delete')}
                       onConfirm={confirmMessageDelete}
                       onCancel={() => setPendingMessageDelete(null)}/>
      </section>
    </div>
  );
}

export default Message;
