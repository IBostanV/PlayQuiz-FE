import React, {useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faPaperPlane, faTrash} from '@fortawesome/free-solid-svg-icons';
import {commentOnPost} from '../../api/groups';
import {Avatar} from '../common/avatar';
import {formatDate} from '../../utils/toDate';

const when = (value) => formatDate(value, undefined, {dateStyle: 'medium', timeStyle: 'short'});

// The comments under a group post, oldest first, and a line to add one for a member. Deleting
// goes through the page's confirmation, so it is handed up.
export const PostComments = ({post, canComment, onAdded, onDelete}) => {
    const {t} = useTranslation();
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const comments = post.comments ?? [];

    const send = (event) => {
        event.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        commentOnPost(post.id, text.trim())
            .then(comment => {
                if (!comment?.id) return;
                onAdded(comment);
                setText('');
            })
            .finally(() => setSending(false));
    };

    if (!comments.length && !canComment) return null;

    return (
        <div className='group-comments'>
            {comments.length > 0 && (
                <ul className='group-comment-list' aria-label={t('comments', 'Comments')}>
                    {comments.map(comment => (
                        <li key={comment.id} className='group-comment'>
                            <Avatar name={comment.author?.displayName ?? '?'} frame={comment.author?.frame} className='group-comment-avatar'/>
                            <div className='group-comment-body'>
                                <span className='group-comment-head'>
                                    {comment.author
                                        ? <Link href={`/profile/${comment.author.id}`} className='group-post-author' style={{color: comment.author.nameColor ?? undefined}}>{comment.author.displayName}</Link>
                                        : <span className='group-post-author'>—</span>}
                                    <span className='group-post-date'>{when(comment.at)}</span>
                                </span>
                                <p className='group-comment-text'>{comment.content}</p>
                            </div>
                            {comment.canDelete && (
                                <button type='button' className='nav-user-action group-danger group-comment-delete'
                                        onClick={() => onDelete(comment)}
                                        aria-label={t('delete_comment', 'Delete comment')}
                                        data-tooltip={t('delete_comment', 'Delete comment')}>
                                    <FontAwesomeIcon icon={faTrash}/>
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {canComment && (
                <form className='group-comment-form' onSubmit={send}>
                    <input value={text} maxLength={1000}
                           placeholder={t('write_comment', 'Write a comment…')}
                           aria-label={t('write_comment', 'Write a comment…')}
                           onChange={event => setText(event.target.value)}/>
                    <button type='submit' className='nav-user-action' disabled={sending || !text.trim()}
                            aria-label={t('send_comment', 'Send comment')} data-tooltip={t('send_comment', 'Send comment')}>
                        <FontAwesomeIcon icon={faPaperPlane}/>
                    </button>
                </form>
            )}
        </div>
    );
};

PostComments.propTypes = {
    post: PropTypes.object.isRequired,
    canComment: PropTypes.bool,
    onAdded: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};
