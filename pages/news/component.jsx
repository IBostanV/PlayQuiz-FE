import React, {useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faNewspaper, faTrash, faUserGroup} from '@fortawesome/free-solid-svg-icons';
import {deleteNews, FRIEND_KINDS, getNews, postNews} from '../../api/feed';
import {useUserContext} from '../../context/user-context';
import {FeedLine} from '../../components/feed/feed-line';
import {Reactions, useReactions} from '../../components/feed/reactions';
import {ConfirmDialog} from '../../components/common/popup';
import {NewsFilterButton, NewsKinds, useNewsFilter} from '../../components/feed/news-filter';

// Everything happening around the player, newest first: patch notes, new questions, friends'
// levels, conquests and posts, and headlines about the site's categories. Every signed-in player
// can post here: an admin's post is a patch note for everyone, anyone else's lands in their own
// and their friends' Friends column.
function News({isLoggedIn}) {
    const {t} = useTranslation();
    const roles = useUserContext();
    const isAdmin = isLoggedIn && roles?.includes('ROLE_ADMIN');
    const [items, setItems] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [busy, setBusy] = useState(false);
    // The post waiting on the delete confirmation.
    const [deleting, setDeleting] = useState(null);

    const load = () => getNews().then(news => setItems(Array.isArray(news) ? news : []));
    // The same choice as the home page's: kept on the account, applied by the server.
    const filter = useNewsFilter(isLoggedIn, load);

    useEffect(() => {
        load();
    }, [isLoggedIn]);

    // What friends did gets a column of its own, as on the home page.
    const [friends, news] = useMemo(() => [
        (items ?? []).filter(item => FRIEND_KINDS.includes(item.type)),
        (items ?? []).filter(item => !FRIEND_KINDS.includes(item.type)),
    ], [items]);
    const {tallies, react} = useReactions(friends, isLoggedIn);

    const publish = (event) => {
        event.preventDefault();
        if (!title.trim() || busy) return;
        setBusy(true);
        postNews(title.trim(), content.trim())
            .then(item => {
                if (!item?.key) return;
                setItems(current => [item, ...(current ?? [])]);
                setTitle('');
                setContent('');
            })
            .finally(() => setBusy(false));
    };

    const remove = () => {
        setBusy(true);
        deleteNews(deleting.refId)
            .then(() => setItems(current => current.filter(other => other.key !== deleting.key)))
            .finally(() => {
                setBusy(false);
                setDeleting(null);
            });
    };

    return (
        <section className='news-page' aria-busy={busy || items === null} data-friends={friends.length > 0 || undefined}>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faNewspaper}/></span>
                <div>
                    <h1 className='trophies-title'>{t('news', 'News')}</h1>
                    <p className='trophies-lead'>
                        {isLoggedIn
                            ? t('news_lead', 'Updates, new questions, your friends and the world, from the last 30 days')
                            : t('news_lead_guest', 'Updates, new questions and the world. Log in to see your friends here too.')}
                    </p>
                </div>
                <NewsFilterButton filter={filter}/>
            </header>

            <NewsKinds filter={filter}/>

            {isLoggedIn && (
                <form className='news-compose' onSubmit={publish}>
                    <input className='news-compose-title' value={title} maxLength={200} required
                           placeholder={t('news_patch_title', 'Title')}
                           aria-label={t('news_patch_title', 'Title')}
                           onChange={event => setTitle(event.target.value)}/>
                    <textarea className='news-compose-text' value={content} maxLength={4000} rows={3}
                              placeholder={isAdmin
                                  ? t('news_patch_text', 'What changed?')
                                  : t('news_post_text', 'Tell your friends something')}
                              aria-label={isAdmin
                                  ? t('news_patch_text', 'What changed?')
                                  : t('news_post_text', 'Tell your friends something')}
                              onChange={event => setContent(event.target.value)}/>
                    <button type='submit' className='profile-secondary-button' disabled={busy || !title.trim()}>
                        {t('news_publish', 'Publish')}
                    </button>
                </form>
            )}

            <div className='news-columns'>
                <div className='news-column'>
                    {items !== null && news.length === 0 && (
                        <p className='feed-empty'>
                            {filter.hidden.length
                                ? t('news_filtered_out', 'Nothing to show with these filters.')
                                : t('news_none', 'No news in the last 30 days.')}
                        </p>
                    )}
                    {news.length > 0 && (
                        <ul className='feed-list'>
                            {news.map(item => (
                                <li key={item.key} className='news-item'>
                                    <FeedLine item={item}/>
                                    {isAdmin && item.type === 'PATCH' && (
                                        <button type='button' className='nav-user-action news-delete' disabled={busy}
                                                onClick={() => setDeleting(item)}
                                                aria-label={t('news_delete', 'Delete patch note')}
                                                data-tooltip={t('news_delete', 'Delete patch note')}>
                                            <FontAwesomeIcon icon={faTrash}/>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Only signed in, and only with something in it: a guest has no friends to follow. */}
                {friends.length > 0 && (
                    <section className='news-column news-friends' aria-labelledby='news-friends-title'>
                        <h2 id='news-friends-title' className='news-friends-title'>
                            <FontAwesomeIcon icon={faUserGroup}/> {t('friends_news', 'Friends')}
                        </h2>
                        <ul className='feed-list'>
                            {friends.map(item => (
                                <li key={item.key} className='news-item'>
                                    <FeedLine item={item}/>
                                    <Reactions tallies={tallies[item.key]} onReact={kind => react(item.key, kind)}/>
                                    {item.type === 'FRIEND_POST' && (item.own || isAdmin) && (
                                        <button type='button' className='nav-user-action news-delete' disabled={busy}
                                                onClick={() => setDeleting(item)}
                                                aria-label={t('news_delete_post', 'Delete post')}
                                                data-tooltip={t('news_delete_post', 'Delete post')}>
                                            <FontAwesomeIcon icon={faTrash}/>
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>

            <ConfirmDialog open={Boolean(deleting)}
                           danger
                           busy={busy}
                           title={deleting?.type === 'PATCH'
                               ? t('news_delete', 'Delete patch note')
                               : t('news_delete_post', 'Delete post')}
                           message={t('news_delete_confirm', '"{{title}}" will be removed from the news for everyone.',
                               {title: deleting?.title})}
                           confirmLabel={t('delete', 'Delete')}
                           onConfirm={remove}
                           onCancel={() => setDeleting(null)}/>
        </section>
    );
}

News.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default News;
