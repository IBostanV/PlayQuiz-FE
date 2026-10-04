import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faGlobe, faLock, faTrash, faUserMinus, faXmark} from '@fortawesome/free-solid-svg-icons';
import {
    approveMember, deleteComment, deleteGroup, deleteGroupPost, getGroup, getGroupPosts, joinGroup, leaveGroup, postInGroup,
    removeMember,
} from '../../api/groups';
import {Avatar} from '../../components/common/avatar';
import {ConfirmDialog} from '../../components/common/popup';
import {Reactions, useReactions} from '../../components/feed/reactions';
import {PostComments} from '../../components/group/post-comments';
import {formatDate} from '../../utils/toDate';

const when = (value) => formatDate(value, undefined, {dateStyle: 'medium', timeStyle: 'short'});

// One group: what it is, joining or leaving it, its posts (members write and comment, everyone
// who may read reacts), and its members. The owner also answers requests to join and can remove people.
function Group() {
    const {t} = useTranslation();
    const router = useRouter();
    const {groupId} = router.query;
    const [page, setPage] = useState(null);
    const [missing, setMissing] = useState(false);
    const [posts, setPosts] = useState([]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    // What waits on a confirmation: {kind: 'post', post} | {kind: 'comment', post, comment} |
    // {kind: 'group'} | {kind: 'member', user}.
    const [confirming, setConfirming] = useState(null);

    const loadPosts = () => getGroupPosts(groupId).then(list => setPosts(Array.isArray(list) ? list : []));

    useEffect(() => {
        if (!router.isReady) return;
        getGroup(groupId).then(found => found?.group ? setPage(found) : setMissing(true));
    }, [router.isReady, groupId]);

    // Read once the page says the reader may; a private group's posts are refused otherwise.
    useEffect(() => {
        if (page?.canRead) loadPosts();
        else setPosts([]);
    }, [page?.canRead, groupId]);

    const {tallies, react} = useReactions(posts.map(post => ({...post, type: 'GROUP_POST'})), Boolean(page?.canRead));

    if (missing) return <p className='profile-missing'>{t('group_not_found', 'There is no such group.')}</p>;
    if (!page) return <section className='news-page' aria-busy/>;

    const {group, canRead, members, pending} = page;
    const isMember = group.role === 'OWNER' || group.role === 'MEMBER';
    const isOwner = group.role === 'OWNER';

    // Every action answers with the page as it now is, or nothing on failure (already toasted).
    const act = (request) => {
        setBusy(true);
        return request.then(next => next?.group && setPage(next)).finally(() => setBusy(false));
    };

    const leave = () => {
        setBusy(true);
        leaveGroup(group.id).then(done => done && getGroup(group.id).then(setPage)).finally(() => setBusy(false));
    };

    const publish = (event) => {
        event.preventDefault();
        if (!text.trim() || busy) return;
        setBusy(true);
        postInGroup(group.id, text.trim())
            .then(post => {
                if (!post?.id) return;
                setPosts(current => [post, ...current]);
                setText('');
            })
            .finally(() => setBusy(false));
    };

    // One post's comments changed: the rest of the list stays as it is.
    const withComments = (postId, change) => setPosts(current => current.map(post =>
        post.id === postId ? {...post, comments: change(post.comments ?? [])} : post));

    const confirm = () => {
        setBusy(true);
        const done = () => {
            setBusy(false);
            setConfirming(null);
        };
        if (confirming.kind === 'post') {
            deleteGroupPost(confirming.post.id)
                .then(ok => ok && setPosts(current => current.filter(post => post.id !== confirming.post.id)))
                .finally(done);
        } else if (confirming.kind === 'comment') {
            deleteComment(confirming.comment.id)
                .then(ok => ok && withComments(confirming.post.id,
                    comments => comments.filter(comment => comment.id !== confirming.comment.id)))
                .finally(done);
        } else if (confirming.kind === 'group') {
            deleteGroup(group.id).then(ok => ok && router.push('/groups')).finally(done);
        } else {
            removeMember(group.id, confirming.user.id).then(next => next?.group && setPage(next)).finally(done);
        }
    };

    return (
        <section className='news-page groups-page' aria-busy={busy} data-friends>
            <header className='group-header'>
                <Avatar name={group.name} className='group-header-avatar'/>
                <div className='group-header-body'>
                    <h1 className='trophies-title'>{group.name}</h1>
                    <p className='group-card-meta'>
                        <FontAwesomeIcon icon={group.privateGroup ? faLock : faGlobe}/>
                        {' '}{group.privateGroup ? t('group_private', 'Private') : t('group_public', 'Public')}
                        {' · '}{t('group_members_count', '{{count}} members', {count: group.members})}
                        {group.owner && <>
                            {' · '}{t('group_owned_by', 'by')}{' '}
                            <Link href={`/profile/${group.owner.id}`}>{group.owner.displayName}</Link>
                        </>}
                    </p>
                    {group.description && <p className='trophies-lead'>{group.description}</p>}
                </div>
                <div className='group-header-actions'>
                    {!group.role && (
                        <button type='button' className='profile-secondary-button' disabled={busy}
                                onClick={() => act(joinGroup(group.id))}>
                            {group.privateGroup ? t('group_ask_join', 'Ask to join') : t('group_join', 'Join')}
                        </button>
                    )}
                    {group.role === 'PENDING' && (
                        <button type='button' className='profile-secondary-button' disabled={busy} onClick={leave}>
                            {t('group_cancel_request', 'Cancel request')}
                        </button>
                    )}
                    {group.role === 'MEMBER' && (
                        <button type='button' className='profile-secondary-button' disabled={busy} onClick={leave}>
                            {t('group_leave', 'Leave')}
                        </button>
                    )}
                    {isOwner && (
                        <button type='button' className='nav-user-action' disabled={busy}
                                onClick={() => setConfirming({kind: 'group'})}
                                aria-label={t('group_delete', 'Delete group')} data-tooltip={t('group_delete', 'Delete group')}>
                            <FontAwesomeIcon icon={faTrash}/>
                        </button>
                    )}
                </div>
            </header>

            <div className='news-columns'>
                <div className='news-column'>
                    {!canRead && (
                        <p className='feed-empty'>
                            {group.role === 'PENDING'
                                ? t('group_private_pending', 'Your request is waiting for the owner. Once you are in, the posts show here.')
                                : t('group_private_locked', 'This group is private. Ask to join to read and write its posts.')}
                        </p>
                    )}

                    {canRead && isMember && (
                        <form className='news-compose' onSubmit={publish}>
                            <textarea value={text} maxLength={4000} rows={3}
                                      placeholder={t('group_post_placeholder', 'Write something to the group')}
                                      aria-label={t('group_post_placeholder', 'Write something to the group')}
                                      onChange={event => setText(event.target.value)}/>
                            <button type='submit' className='profile-secondary-button' disabled={busy || !text.trim()}>
                                {t('news_publish', 'Publish')}
                            </button>
                        </form>
                    )}
                    {canRead && !isMember && (
                        <p className='profile-hint'>{t('group_join_to_post', 'Join the group to write in it.')}</p>
                    )}

                    {canRead && (posts.length ? (
                        <ul className='feed-list'>
                            {posts.map(post => (
                                <li key={post.id} className='group-post'>
                                    <div className='group-post-head'>
                                        <Avatar name={post.author?.displayName ?? '?'} frame={post.author?.frame} className='group-post-avatar'/>
                                        {post.author
                                            ? <Link href={`/profile/${post.author.id}`} className='group-post-author' style={{color: post.author.nameColor ?? undefined}}>{post.author.displayName}</Link>
                                            : <span className='group-post-author'>—</span>}
                                        <span className='group-post-date'>{when(post.at)}</span>
                                        {post.canDelete && (
                                            <button type='button' className='nav-user-action news-delete' disabled={busy}
                                                    onClick={() => setConfirming({kind: 'post', post})}
                                                    aria-label={t('news_delete_post', 'Delete post')}
                                                    data-tooltip={t('news_delete_post', 'Delete post')}>
                                                <FontAwesomeIcon icon={faTrash}/>
                                            </button>
                                        )}
                                    </div>
                                    <p className='group-post-text'>{post.content}</p>
                                    <Reactions tallies={tallies[post.key]} onReact={kind => react(post.key, kind)}/>
                                    <PostComments post={post} canComment={isMember}
                                                  onAdded={comment => withComments(post.id, comments => [...comments, comment])}
                                                  onDelete={comment => setConfirming({kind: 'comment', post, comment})}/>
                                </li>
                            ))}
                        </ul>
                    ) : <p className='feed-empty'>{t('group_no_posts', 'No posts yet.')}</p>)}
                </div>

                <aside className='news-column news-friends'>
                    {isOwner && pending.length > 0 && (
                        <section aria-labelledby='group-pending-title'>
                            <h2 id='group-pending-title' className='news-friends-title'>
                                {t('group_requests', 'Requests to join')}
                            </h2>
                            <ul className='group-members'>
                                {pending.map(user => (
                                    <li key={user.id} className='group-member'>
                                        <Avatar name={user.displayName} frame={user.frame}/>
                                        <Link href={`/profile/${user.id}`}>{user.displayName}</Link>
                                        <button type='button' className='nav-user-action' disabled={busy}
                                                onClick={() => act(approveMember(group.id, user.id))}
                                                aria-label={t('group_approve', 'Let {{name}} in', {name: user.displayName})}
                                                data-tooltip={t('group_approve_short', 'Let in')}>
                                            <FontAwesomeIcon icon={faCheck}/>
                                        </button>
                                        <button type='button' className='nav-user-action group-danger' disabled={busy}
                                                onClick={() => act(removeMember(group.id, user.id))}
                                                aria-label={t('group_decline', 'Turn down {{name}}', {name: user.displayName})}
                                                data-tooltip={t('group_decline_short', 'Turn down')}>
                                            <FontAwesomeIcon icon={faXmark}/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section aria-labelledby='group-members-title'>
                        <h2 id='group-members-title' className='news-friends-title'>{t('group_members', 'Members')}</h2>
                        {canRead ? (
                            <ul className='group-members'>
                                {members.map(user => (
                                    <li key={user.id} className='group-member'>
                                        <Avatar name={user.displayName} frame={user.frame}/>
                                        <Link href={`/profile/${user.id}`}>{user.displayName}</Link>
                                        {isOwner && user.id !== group.owner?.id && (
                                            <button type='button' className='nav-user-action group-danger' disabled={busy}
                                                    onClick={() => setConfirming({kind: 'member', user})}
                                                    aria-label={t('group_remove', 'Remove {{name}}', {name: user.displayName})}
                                                    data-tooltip={t('remove', 'Remove')}>
                                                <FontAwesomeIcon icon={faUserMinus}/>
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className='profile-hint'>{t('group_members_hidden', 'Members show to members only.')}</p>}
                    </section>
                </aside>
            </div>

            <ConfirmDialog open={Boolean(confirming)}
                           danger
                           busy={busy}
                           title={{
                               post: t('news_delete_post', 'Delete post'),
                               comment: t('delete_comment', 'Delete comment'),
                               group: t('group_delete', 'Delete group'),
                               member: t('group_remove_title', 'Remove member?'),
                           }[confirming?.kind]}
                           message={{
                               post: t('group_delete_post_confirm', 'The post will be removed from the group.'),
                               comment: t('group_delete_comment_confirm', 'The comment will be removed.'),
                               group: t('group_delete_confirm', '"{{name}}" and all its posts will be deleted for everyone.', {name: group.name}),
                               member: t('group_remove_confirm', '{{name}} will be removed from the group.', {name: confirming?.user?.displayName}),
                           }[confirming?.kind]}
                           confirmLabel={confirming?.kind === 'member' ? t('remove', 'Remove') : t('delete', 'Delete')}
                           onConfirm={confirm}
                           onCancel={() => setConfirming(null)}/>
        </section>
    );
}

export default Group;
