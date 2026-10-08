import React, {useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faNewspaper, faUserGroup} from '@fortawesome/free-solid-svg-icons';
import {FRIEND_KINDS, getNews} from '../../api/feed';
import {FeedLine} from '../feed/feed-line';
import {Reactions, useReactions} from '../feed/reactions';
import {NewsFilterButton, NewsKinds, useNewsFilter} from '../feed/news-filter';

// How many lines show at first, and how many more each "Load more" adds.
const FIRST = 20;
const MORE = 5;

// One block's lines, the newest few first and more on request. The server sends the whole feed
// newest first (a month at most), so "more" is only showing more of what is already here.
// `cards`: each item a small block of its own, in a grid, instead of a line in a list.
const Lines = ({items, empty, cards = false}) => {
    const {t} = useTranslation();
    const [shown, setShown] = useState(FIRST);

    // A fresh list (the filter changed) starts from the top again.
    useEffect(() => setShown(FIRST), [items]);
    const {tallies, react} = useReactions(items.slice(0, shown));

    if (!items.length) return <p className='feed-empty'>{empty}</p>;

    return (
        <>
            <ul className={cards ? 'home-news-cards' : 'feed-list'}>
                {items.slice(0, shown).map(item => (
                    <li key={item.key} className={cards ? 'home-news-card' : undefined}>
                        <FeedLine item={item}/>
                        <Reactions tallies={tallies[item.key]} onReact={kind => react(item.key, kind)}/>
                    </li>
                ))}
            </ul>
            {shown < items.length && (
                <button type='button' className='home-news-more' onClick={() => setShown(count => count + MORE)}>
                    {t('load_more', 'Load more')}
                </button>
            )}
        </>
    );
};

Lines.propTypes = {
    items: PropTypes.arrayOf(PropTypes.object).isRequired,
    empty: PropTypes.string,
    cards: PropTypes.bool,
};

// The home page's news, with friends' conquests and level-ups in a block of their own. The kinds
// the player switched off are left out by the server; the filter is on the news block and covers both.
export const HomeNews = ({isLoggedIn}) => {
    const {t} = useTranslation();
    const [items, setItems] = useState([]);

    const load = () => getNews().then(news => setItems(Array.isArray(news) ? news : []));
    const filter = useNewsFilter(isLoggedIn, load);

    useEffect(() => {
        load();
    }, [isLoggedIn]);

    // Memoised: each block starts over from the top when its list changes, which must mean the
    // news was fetched again, not that this re-rendered.
    const [friends, news] = useMemo(() => [
        items.filter(item => FRIEND_KINDS.includes(item.type)),
        items.filter(item => !FRIEND_KINDS.includes(item.type)),
    ], [items]);

    return (
        <>
            {/* Nothing to show and nothing switched off: no block. With kinds switched off it
                stays, or there would be no way to switch them back on. */}
            {(news.length > 0 || filter.hidden.length > 0) && (
                <section className='home-news home-news-board' aria-labelledby='home-news-title'
                         data-beside-friends={friends.length > 0 || undefined}>
                    <header className='home-news-header'>
                        <span className='home-news-icon' aria-hidden><FontAwesomeIcon icon={faNewspaper}/></span>
                        <h2 id='home-news-title' className='did-you-know-title'>{t('news', 'News')}</h2>
                        <NewsFilterButton filter={filter}/>
                        <Link href='/news' className='did-you-know-more home-news-all'>
                            {t('news_all', 'All news')}
                            <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
                        </Link>
                    </header>
                    <NewsKinds filter={filter}/>
                    <Lines items={news} cards empty={t('news_filtered_out', 'Nothing to show with these filters.')}/>
                </section>
            )}

            {/* Only signed in, and only with something in it: a guest has no friends to follow. */}
            {friends.length > 0 && (
                <section className='home-news home-news-board home-friends' aria-labelledby='home-friends-title'>
                    <header className='home-news-header'>
                        <span className='home-news-icon' aria-hidden><FontAwesomeIcon icon={faUserGroup}/></span>
                        <h2 id='home-friends-title' className='did-you-know-title'>{t('friends_news', 'Friends')}</h2>
                    </header>
                    <Lines items={friends} cards/>
                </section>
            )}
        </>
    );
};

HomeNews.propTypes = {
    isLoggedIn: PropTypes.bool,
};
