import React, {useEffect, useRef, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faBell, faBellSlash} from '@fortawesome/free-solid-svg-icons';
import {getNotifications, markNotificationsRead, NOTIFICATIONS_CHANGED} from '../../api/feed';
import {EXPERIENCE_CHANGED} from '../../api/quiz/save';
import {FeedLine} from '../feed/feed-line';

// ponytail: mostly polled. Every event here is worked out on the server when it is read; the few
// pushed over the socket (challenges, duel invitations) fire NOTIFICATIONS_CHANGED to re-read at once.
const POLL_MS = 2 * 60 * 1000;

// The bell in the navbar: how many notifications are new, and the list under it. Opening the list
// marks everything in it as read; the ones that were new stay highlighted until it closes.
export const NotificationBell = () => {
    const {t} = useTranslation();
    const router = useRouter();
    const [feed, setFeed] = useState({unread: 0, items: []});
    const [open, setOpen] = useState(false);
    // How many were new when the list opened, so they stay marked while it is up.
    const [newOnOpen, setNewOnOpen] = useState(0);
    const rootRef = useRef(null);

    // Re-read on every page, on a timer, and after a quiz (which is what earns trophies).
    useEffect(() => {
        const reload = () => getNotifications().then(result => result?.items && setFeed(result));
        reload();
        const timer = setInterval(reload, POLL_MS);
        window.addEventListener(EXPERIENCE_CHANGED, reload);
        window.addEventListener(NOTIFICATIONS_CHANGED, reload);
        return () => {
            clearInterval(timer);
            window.removeEventListener(EXPERIENCE_CHANGED, reload);
            window.removeEventListener(NOTIFICATIONS_CHANGED, reload);
        };
    }, [router.asPath]);

    useEffect(() => setOpen(false), [router.asPath]);

    // Closes on a click anywhere else, or on Escape.
    useEffect(() => {
        if (!open) return undefined;
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const toggle = () => {
        if (open) {
            setOpen(false);
            return;
        }
        setNewOnOpen(feed.unread);
        setOpen(true);
        if (feed.unread > 0) {
            markNotificationsRead().then(() => setFeed(current => ({...current, unread: 0})));
        }
    };

    const label = feed.unread
        ? t('notifications_unread', 'Notifications, {{count}} new', {count: feed.unread})
        : t('notifications', 'Notifications');

    return (
        <span className='nav-bell' ref={rootRef}>
            <button type='button' className='nav-user-action' onClick={toggle}
                    aria-label={label} aria-expanded={open} aria-haspopup='true'
                    data-tooltip={open ? undefined : label} data-tooltip-placement='bottom'>
                <FontAwesomeIcon icon={faBell}/>
                {feed.unread > 0 && (
                    <span className='nav-user-badge' aria-hidden>{feed.unread > 99 ? '99+' : feed.unread}</span>
                )}
            </button>
            {open && (
                <div className='nav-bell-panel' role='region' aria-label={t('notifications', 'Notifications')}>
                    <header className='nav-bell-head'>
                        <span className='nav-bell-orb' aria-hidden><FontAwesomeIcon icon={faBell}/></span>
                        <h2 className='nav-bell-title'>{t('notifications', 'Notifications')}</h2>
                        {newOnOpen > 0 && (
                            <span className='nav-bell-new'>
                                {t('notifications_new_count', '{{count}} new', {count: newOnOpen})}
                            </span>
                        )}
                    </header>

                    {feed.items.length ? (
                        <div className='nav-bell-scroll'>
                            {/* The new ones first under their own heading, then the rest. */}
                            {[
                                [feed.items.slice(0, newOnOpen), t('notifications_group_new', 'New'), true],
                                [feed.items.slice(newOnOpen), t('notifications_group_earlier', 'Earlier'), false],
                            ].filter(([items]) => items.length).map(([items, heading, unread]) => (
                                <section key={heading} className='nav-bell-group'>
                                    {newOnOpen > 0 && <h3 className='nav-bell-group-title'>{heading}</h3>}
                                    <ul className='feed-list'>
                                        {items.map(item => (
                                            <li key={item.key}>
                                                <FeedLine item={item} unread={unread} onOpen={() => setOpen(false)}/>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    ) : (
                        <div className='nav-bell-empty'>
                            <span className='nav-bell-empty-icon' aria-hidden><FontAwesomeIcon icon={faBellSlash}/></span>
                            <p className='feed-empty'>{t('notifications_none', 'Nothing new yet.')}</p>
                        </div>
                    )}

                    <Link href='/news' className='nav-bell-more'>
                        {t('news_all', 'All news')}
                        <FontAwesomeIcon icon={faArrowRight}/>
                    </Link>
                </div>
            )}
        </span>
    );
};
