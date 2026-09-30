import React, {useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faAnglesUp, faBookOpen, faCircleQuestion, faCommentDots, faCrown, faEarthAmericas, faFlag, faHandFist,
    faNewspaper, faScrewdriverWrench, faTrophy
} from '@fortawesome/free-solid-svg-icons';
import {toDate} from '../../utils/toDate';
import {ConfirmDialog} from '../common/popup';

// One notification or news line. The server sends what happened; the words are here, with the
// translations, the same way the daily tasks do it. Each type: its icon, where it leads, and the
// sentence.
const TYPES = {
    CONQUEST_ROUND: {
        icon: faEarthAmericas,
        href: () => '/conquest',
        text: (item, t) => t('feed_conquest_round', 'Conquest round {{round}} is open: {{countries}}',
            {round: item.count, countries: (item.names ?? []).join(', ')}),
    },
    CONQUEST_LOST: {
        icon: faFlag,
        href: () => '/conquest',
        text: (item, t) => t('feed_conquest_lost', '{{user}} took {{country}} from you',
            {user: item.user?.displayName, country: item.name}),
    },
    TROPHY: {
        icon: faTrophy,
        href: () => '/trophies',
        text: (item, t) => t('feed_trophy', 'New trophy: {{title}}', {title: item.title}),
    },
    WIKI_ARTICLE: {
        icon: faBookOpen,
        href: (item) => `/knowledge-base/${item.refId}`,
        text: (item, t) => t('feed_wiki_article', 'New in {{category}} on the wiki: {{title}}',
            {category: item.name, title: item.title}),
    },
    PATCH: {
        icon: faScrewdriverWrench,
        text: (item) => item.title,
    },
    QUESTIONS_ADDED: {
        icon: faCircleQuestion,
        href: (item) => `/quiz/categorized/${item.refId}`,
        // The link starts a quiz on the spot, clock and all, so it asks first.
        confirm: (item, t) => ({
            title: t('feed_start_quiz_title', 'Start a quiz?'),
            message: t('feed_start_quiz', 'A quiz on {{category}} starts as soon as you continue, and its time counts from there.',
                {category: item.name}),
            confirmLabel: t('start_quiz', 'Start quiz'),
        }),
        text: (item, t) => t('feed_questions_added', 'New questions in {{category}}: {{count}}',
            {category: item.name, count: item.count}),
    },
    FRIEND_LEVELS: {
        icon: faAnglesUp,
        text: (item, t) => t('feed_friend_levels', 'Friends levelled up: {{list}}', {
            list: (item.levels ?? [])
                .map(({user, level}) => t('feed_friend_level', '{{name}} (level {{level}})',
                    {name: user?.displayName, level}))
                .join(', '),
        }),
    },
    FRIEND_CONQUEST: {
        icon: faCrown,
        href: () => '/conquest',
        text: (item, t) => t('feed_friend_conquest', '{{user}} conquered {{country}}',
            {user: item.user?.displayName, country: item.name}),
    },
    // What a friend (or the reader) posted on the News page. Leads to the author's profile.
    FRIEND_POST: {
        icon: faCommentDots,
        href: (item) => item.user?.id && !item.own ? `/profile/${item.user.id}` : undefined,
        text: (item, t) => item.own
            ? t('feed_own_post', 'You: {{title}}', {title: item.title})
            : t('feed_friend_post', '{{user}}: {{title}}', {user: item.user?.displayName, title: item.title}),
    },
    // A friend's "beat my score": opens the Together page, where it is played.
    CHALLENGE: {
        icon: faHandFist,
        href: () => '/challenges',
        text: (item, t) => t('feed_challenge', '{{user}} challenges you: {{category}}',
            {user: item.user?.displayName, category: item.name ?? t('express_quiz', 'Express quiz')}),
    },
    // The friend has answered one the reader sent; title says how it went for the reader.
    CHALLENGE_DONE: {
        icon: faHandFist,
        href: () => '/challenges',
        text: (item, t) => {
            const values = {user: item.user?.displayName, category: item.name ?? t('express_quiz', 'Express quiz')};
            return {
                WON: t('feed_challenge_won', '{{user}} took on your {{category}} challenge, and you won', values),
                LOST: t('feed_challenge_lost', '{{user}} beat your score in {{category}}', values),
                DRAW: t('feed_challenge_draw', '{{user}} matched your score in {{category}} exactly', values),
            }[item.title] ?? t('feed_challenge_done', '{{user}} took on your {{category}} challenge', values);
        },
    },
    WORLD: {
        icon: faNewspaper,
        href: (item) => item.url,
        external: true,
        text: (item) => item.title,
    },
};

// "5 minutes ago", "3 days ago": close enough for a feed, and in the reader's own language.
const timeAgo = (date, language) => {
    const seconds = (date.getTime() - Date.now()) / 1000;
    const format = new Intl.RelativeTimeFormat(language, {numeric: 'auto'});
    const units = [['day', 86400], ['hour', 3600], ['minute', 60]];
    const [unit, size] = units.find(([, span]) => Math.abs(seconds) >= span) ?? ['minute', 60];
    return format.format(Math.round(seconds / size), unit);
};

export const FeedLine = ({item, unread, onOpen}) => {
    const {t, i18n} = useTranslation();
    const router = useRouter();
    const [confirming, setConfirming] = useState(false);
    const type = TYPES[item.type];
    if (!type) return null;

    const href = type.href?.(item);
    // The server's LocalDateTime arrives as Jackson's [year, month, day, …] array, not a string.
    const at = toDate(item.at);
    // Where it came from: the site for a headline, the category for the rest that have one.
    const source = item.type === 'WORLD' ? [item.text, item.name].filter(Boolean).join(' · ') : null;

    const body = (
        <>
            <span className='feed-line-icon' data-type={item.type} aria-hidden>
                <FontAwesomeIcon icon={type.icon}/>
            </span>
            <span className='feed-line-body'>
                <span className='feed-line-text'>{type.text(item, t)}</span>
                {(item.type === 'PATCH' || item.type === 'FRIEND_POST') && item.text && (
                    <span className='feed-line-detail'>{item.text}</span>
                )}
                <span className='feed-line-meta'>
                    {source}
                    {source && at && ' · '}
                    {at && <time dateTime={at.toISOString()}>{timeAgo(at, i18n.language)}</time>}
                </span>
            </span>
        </>
    );

    if (!href) {
        return <div className='feed-line' data-unread={unread || undefined}>{body}</div>;
    }
    if (type.external) {
        return (
            <a className='feed-line' href={href} target='_blank' rel='noopener noreferrer'
               data-unread={unread || undefined} onClick={onOpen}>{body}</a>
        );
    }
    if (!type.confirm) {
        return <Link className='feed-line' href={href} data-unread={unread || undefined} onClick={onOpen}>{body}</Link>;
    }

    // Still a link, so opening it in a new tab works as ever; a plain click asks first. The
    // dialog sits beside the link, not in it, and whatever holds the line (the bell's list) is
    // only told it was opened once the player has said yes.
    const plainClick = (event) => !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
    const confirm = type.confirm(item, t);

    return (
        <>
            <Link className='feed-line' href={href} data-unread={unread || undefined}
                  onClick={event => {
                      if (!plainClick(event)) return;
                      event.preventDefault();
                      setConfirming(true);
                  }}>
                {body}
            </Link>
            <ConfirmDialog open={confirming}
                           title={confirm.title}
                           message={confirm.message}
                           confirmLabel={confirm.confirmLabel}
                           onConfirm={() => {
                               setConfirming(false);
                               onOpen?.();
                               router.push(href);
                           }}
                           onCancel={() => setConfirming(false)}/>
        </>
    );
};

FeedLine.propTypes = {
    item: PropTypes.shape({
        key: PropTypes.string,
        type: PropTypes.string,
        at: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
        title: PropTypes.string,
        text: PropTypes.string,
        url: PropTypes.string,
        refId: PropTypes.number,
        name: PropTypes.string,
        count: PropTypes.number,
    }).isRequired,
    unread: PropTypes.bool,
    onOpen: PropTypes.func,
};
