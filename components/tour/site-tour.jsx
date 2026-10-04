import React, {useEffect, useLayoutEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {getCurrentUser, markTourSeen} from '../../api/user';
import {useAppearance} from '../../context/appearance';

// The guided tour of the site: a spotlight on one part of the page at a time, with a card saying
// what it is for. It starts by itself until the account has been through it (Q_USER.TOUR_SEEN,
// which existing accounts started with set), and again whenever /home is opened with ?tour (the
// compass in the navbar). A guest gets it too, remembered in this browser only, and the steps for
// what needs an account (profile, coins, friends…) drop out because their elements are not there.

// Each step points at an element by selector; a step whose element is not on the page (an admin
// link, a block hidden in Appearance) is skipped rather than pointing at nothing.
const STEPS = [
    {title: ['tour_welcome_title', 'Welcome to Play Quiz!'],
        text: ['tour_welcome_text', 'A quick look around, so you know where everything is. It takes a minute.']},
    {selector: '.nav-brand',
        title: ['tour_home_title', 'Home'],
        text: ['tour_home_text', 'The logo always brings you back to this home page, wherever you are.']},
    {selector: '.nav-links',
        title: ['tour_sections_title', 'Main sections'],
        text: ['tour_sections_text', 'Everything to play and read: quizzes, the IQ test, the knowledge base, news and chat.']},
    {selector: '.nav-menu-button',
        title: ['tour_quiz_menu_title', 'Quiz'],
        text: ['tour_quiz_menu_text', 'Every way to play: pick a category, a quick express quiz, or Together, with the daily challenge, duels and challenges with friends.']},
    {selector: '.nav-link-pill[href="/conquest"]',
        title: ['tour_conquest_title', 'Conquest'],
        text: ['tour_conquest_text', 'Every country on the map is a category. Score best in a round and the country is yours.']},
    {selector: '.nav-link-pill[href="/groups"]',
        title: ['tour_groups_title', 'Groups'],
        text: ['tour_groups_text', 'Join communities or start your own, public or private, and post in them.']},
    {selector: '.nav-create',
        title: ['tour_create_title', 'Create a quiz'],
        text: ['tour_create_text', 'Write your own quiz and invite friends to take it.']},
    // Guests only: the navbar has Register where a player has their profile.
    {selector: '.nav-register',
        title: ['tour_register_title', 'Create an account'],
        text: ['tour_register_text', 'Free, and only an email. It keeps your results, levels and trophies, and opens Conquest, the IQ test and playing with friends.']},
    {selector: '.nav-user-identity',
        title: ['tour_profile_title', 'Your profile'],
        text: ['tour_profile_text', 'Set your username and picture, and see your quiz history and stats.']},
    {selector: '.nav-user-level',
        title: ['tour_level_title', 'Level and coins'],
        text: ['tour_level_text', 'Quizzes, daily visits and tasks earn experience and fill your level bar.']},
    {selector: '.nav-user-coins',
        title: ['tour_coins_title', 'Coins'],
        text: ['tour_coins_text', 'You earn coins along with experience. Click them to open the shop: hints, streak freezes, avatar frames and name colours.']},
    {selector: '.nav-bell',
        title: ['tour_bell_title', 'Notifications'],
        text: ['tour_bell_text', 'Level-ups, friends\' news and what is new on the site.']},
    {selector: '.nav-user-action[href="/season"]',
        title: ['tour_season_title', 'Season pass'],
        text: ['tour_season_text', 'Weekly quests and daily tasks fill a 30-day track. Claim coins, a name colour and a champion frame as you go.']},
    {selector: '.nav-user-action[href="/trophies"]',
        title: ['tour_trophies_title', 'Trophies'],
        text: ['tour_trophies_text', 'Trophies you have won and the ones still to win. Some stay secret until you get them.']},
    {selector: '.nav-user-action[href="/appearance"]',
        title: ['tour_appearance_title', 'Appearance'],
        text: ['tour_appearance_text', 'Change the colours, text size and layout of the site to your taste.']},
    {selector: '.daily-tasks',
        title: ['tour_daily_title', 'Daily tasks'],
        text: ['tour_daily_text', 'Three goals every day, each paying extra experience.']},
    {selector: '.friends-panel',
        title: ['tour_friends_title', 'Friends'],
        text: ['tour_friends_text', 'Open it to find people and add them, see who is online, chat or start a duel.']},
    {title: ['tour_done_title', 'You are all set'],
        text: ['tour_done_text', 'Have fun! You can take this tour again any time with the compass at the top.'],
        guestText: ['tour_done_text_guest', 'Have fun! Register to keep your progress, earn levels and play with friends.'],
        // For a player who hid the compass in Appearance.
        textNoCompass: ['tour_done_text_no_compass', 'Have fun! You can take this tour again any time at /home?tour.']},
];

const GAP = 12;
const GUEST_SEEN_KEY = 'siteTourSeen';

const guestHasSeen = () => {
    try { return Boolean(localStorage.getItem(GUEST_SEEN_KEY)); } catch { return false; }
};

const isOnPage = (step) => !step.selector || Boolean(document.querySelector(step.selector));

export const SiteTour = ({isLoggedIn}) => {
    const router = useRouter();
    const {t} = useTranslation();
    const {settings: appearance} = useAppearance();
    const [seen, setSeen] = useState(true);
    const [index, setIndex] = useState(-1);
    const [rect, setRect] = useState(null);

    // Asked for ?tour, or someone who has not been through it yet. The pause lets the home
    // page's blocks load in, so the steps that point at them find them.
    useEffect(() => {
        if (router.pathname !== '/home') return undefined;
        let timer;
        const start = (alreadySeen) => {
            setSeen(alreadySeen);
            if ('tour' in router.query || !alreadySeen) timer = setTimeout(() => setIndex(0), 900);
        };
        if (isLoggedIn) {
            getCurrentUser().then(user => user?.id && start(Boolean(user.tourSeen)));
        } else {
            start(guestHasSeen());
        }
        return () => clearTimeout(timer);
    }, [router.pathname, router.query, isLoggedIn]);

    const step = STEPS[index];

    const finish = () => {
        setIndex(-1);
        if (!seen && isLoggedIn) markTourSeen().then(() => setSeen(true));
        if (!seen && !isLoggedIn) {
            try { localStorage.setItem(GUEST_SEEN_KEY, 'true'); } catch { /* storage off: shown again next time */ }
            setSeen(true);
        }
        if ('tour' in router.query) router.replace('/home', undefined, {shallow: true});
    };

    // Forward or back to the next step whose element is on the page.
    const go = (direction) => {
        let next = index + direction;
        while (next >= 0 && next < STEPS.length && !isOnPage(STEPS[next])) next += direction;
        if (next >= STEPS.length) finish();
        else if (next >= 0) setIndex(next);
    };

    // Bring the element into view and follow it while the page scrolls or resizes.
    useLayoutEffect(() => {
        if (!step) return undefined;
        const target = step.selector && document.querySelector(step.selector);
        if (!target) {
            setRect(null);
            return undefined;
        }
        target.scrollIntoView({block: 'center', behavior: 'smooth'});
        const measure = () => setRect(target.getBoundingClientRect());
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [index]);

    useEffect(() => {
        if (!step) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') finish();
            if (event.key === 'ArrowRight') go(1);
            if (event.key === 'ArrowLeft') go(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    if (!step) return null;

    // The card goes under the element, or over it when there is no room below; with no element
    // it sits in the middle of the screen.
    const cardWidth = Math.min(340, window.innerWidth - 32);
    const cardStyle = rect ? {
        left: Math.max(16, Math.min(rect.left + rect.width / 2 - cardWidth / 2, window.innerWidth - cardWidth - 16)),
        width: cardWidth,
        ...(rect.bottom + 220 < window.innerHeight
            ? {top: rect.bottom + GAP}
            : {bottom: window.innerHeight - rect.top + GAP}),
    } : {left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth};

    const shown = STEPS.filter(isOnPage);
    const position = shown.indexOf(step) + 1;
    const last = position === shown.length;

    return (
        <div className='tour' role='dialog' aria-modal='true' aria-labelledby='tour-title' aria-describedby='tour-text'>
            {/* Clicks on the dimmed page are caught here, so the tour is not left half-way. */}
            <div className='tour-blocker'/>
            {rect ? (
                <div className='tour-spotlight' style={{
                    top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
                }}/>
            ) : <div className='tour-dim'/>}
            <div className='tour-card' style={cardStyle} key={index}>
                <p className='tour-step'>{position} / {shown.length}</p>
                <h2 id='tour-title' className='tour-title'>{t(...step.title)}</h2>
                <p id='tour-text' className='tour-text'>{t(...((!isLoggedIn && step.guestText) || (appearance.hideTourLink && step.textNoCompass) || step.text))}</p>
                <div className='tour-actions'>
                    {!last && (
                        <button type='button' className='tour-skip' onClick={finish}>{t('tour_skip', 'Skip')}</button>
                    )}
                    {position > 1 && (
                        <button type='button' className='tour-back' onClick={() => go(-1)}>{t('back', 'Back')}</button>
                    )}
                    <button type='button' className='tour-next' onClick={() => go(1)} autoFocus>
                        {last ? t('tour_finish', 'Let\'s play') : t('next', 'Next')}
                    </button>
                </div>
            </div>
        </div>
    );
};
