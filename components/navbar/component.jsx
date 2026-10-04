import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {logout} from '../../api/authentication';
import {useTranslation} from "react-i18next";
import getLanguages from "../../api/question/get-languages";
import saveUserLanguage from "../../api/profile/save-language";
import {toast} from "react-toastify";
import {SecureComponent} from "../security";
import {FlexContainer} from "../common/FlexContainer";
import {Image} from "react-bootstrap";
import {getCurrentUser} from "../../api/user";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
  faBolt, faBookOpen, faCoins, faBrain, faComments, faEarthAmericas, faEnvelopeOpenText, faFire, faGaugeHigh,
  faGear, faNewspaper, faPalette, faPuzzlePiece, faRightFromBracket, faTrophy, faWandMagicSparkles, faPeopleGroup} from "@fortawesome/free-solid-svg-icons";
import {useUserContext} from "../../context/user-context";
import {ConfirmDialog} from "../common/popup";
import {Avatar} from "../common/avatar";
import {TrophyBadge} from "../trophy/trophy-badge";
import {FEEDBACK_CHANGED, getOpenFeedbackCount} from "../../api/feedback";
import {EXPERIENCE_CHANGED} from "../../api/quiz/save";
import {COINS_CHANGED} from "../../api/coin";
import {NotificationBell} from "./notification-bell";

// Main sections, shown to everyone, in the order a player works through them: the two ways to
// take a quiz, the test that measures you, then the reading and the chat — with Conquest in the
// middle, where its outlined pill sits between the things you take and the things you read.
const MAIN_LINKS = [
  {href: '/quiz/categorized', text: 'take_quiz', icon: faPuzzlePiece},
  {href: '/quiz/express', text: 'express_quiz', icon: faBolt},
  // The test is kept on the player's account — the score, the norming and the retakes all
  // depend on knowing whose run it is — so a guest sees it shut rather than half-usable.
  {href: '/iq', text: 'iq_test', label: 'IQ test', icon: faBrain,
    guestTip: ['iq_sign_in_short', 'Log in to take the IQ test']},
  // Marked out with an outline of its own: it is the game, not a section. A guest sees it — the
  // map reads signed out — but cannot take part, so the pill is shown as shut rather than hidden.
  {href: '/conquest', text: 'conquest', label: 'Conquest', icon: faEarthAmericas, highlight: true,
    guestTip: ['conquest_sign_in', 'Log in to take part in the conquest']},
  // Playing with friends: the daily challenge, challenges, live duels and rooms.
  {href: '/challenges', text: 'play_together', label: 'Together', icon: faPeopleGroup,
    guestTip: ['together_sign_in', 'Log in to play with friends']},
  {href: '/knowledge-base', text: 'knowledge_base', icon: faBookOpen},
  // Patch notes, new questions and headlines read for everyone; friends' news needs an account.
  {href: '/news', text: 'news', label: 'News', icon: faNewspaper},
  // Nothing to show a guest: every chat belongs to an account.
  {href: '/chat', text: 'chat', icon: faComments, account: true},
];

// The main links as pills in one capsule; the current section is the filled one.
const MainLinks = ({isLoggedIn}) => {
  const router = useRouter();
  const {t} = useTranslation();

  // Match the section, not just the exact page, so /chat/[chatId] still lights up /chat.
  const isActive = (href) => router.pathname === href || router.pathname.startsWith(`${href}/`);

  // Sections needing an account are not shown to a guest at all; a section a guest may look at
  // but not use is shown shut, with the tooltip saying why.
  const links = MAIN_LINKS.filter(link => isLoggedIn || !link.account);

  return (
    <nav className="nav-links" aria-label={t('main_navigation', 'Main navigation')}>
      {links.map(link => {
        const shut = !isLoggedIn && Boolean(link.guestTip);
        const body = (
          <>
            <FontAwesomeIcon icon={link.icon}/>
            <span className="nav-link-label">{t(link.text, link.label)}</span>
          </>
        );

        // A span, not a disabled link: there is nowhere for it to go, and the tooltip is the
        // whole point of leaving it on the bar.
        return shut ? (
          <span key={link.href}
                className="nav-link-pill"
                data-highlight={link.highlight || undefined}
                data-shut="true"
                aria-disabled="true"
                data-tooltip={t(...link.guestTip)}
                data-tooltip-placement="bottom">
            {body}
          </span>
        ) : (
          <Link key={link.href}
                href={link.href}
                className="nav-link-pill"
                data-highlight={link.highlight || undefined}
                aria-current={isActive(link.href) ? 'page' : undefined}
                // Names the section when narrow screens collapse the pills to icons.
                data-tooltip={t(link.text, link.label)}
                data-tooltip-placement="bottom">
            {body}
          </Link>
        );
      })}
    </nav>
  );
};

function Navbar({ isLoggedIn }) {
  const router = useRouter();
  const {t, i18n} = useTranslation();
  const roles = useUserContext();
  const isAdmin = roles?.includes('ROLE_ADMIN');
  // Content editors and publishers reach the content dashboard, and admins reach both.
  const isContentEditor = isAdmin
      || roles?.includes('ROLE_CONTENT_EDITOR')
      || roles?.includes('ROLE_CONTENT_PUBLISHER');

  const [languages, setLanguages] = useState([]);
  const [language, setLanguage] = useState(1);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setUser(null);
      return undefined;
    }
    // Re-read on EXPERIENCE_CHANGED as well: finishing a quiz pays experience, and the level bar
    // below would otherwise stay where it was until the next full reload. Coins likewise.
    const reload = () => getCurrentUser().then(setUser);
    reload();
    window.addEventListener(EXPERIENCE_CHANGED, reload);
    window.addEventListener(COINS_CHANGED, reload);
    return () => {
      window.removeEventListener(EXPERIENCE_CHANGED, reload);
      window.removeEventListener(COINS_CHANGED, reload);
    };
  }, [isLoggedIn]);

  // The sign-out icon only opens the confirm popup; its confirm button does the logout.
  // Admins: how many player messages are still open, as a badge on the dashboard link. Recounted
  // on every page change and whenever the Feedback tab resolves or reopens one.
  const [openFeedback, setOpenFeedback] = useState(0);
  useEffect(() => {
    // Also on isLoggedIn: signing out changes the route before the roles are cleared, and this
    // would recount for a session that is already gone.
    if (!isAdmin || !isLoggedIn) return undefined;
    const recount = () => getOpenFeedbackCount().then(count => setOpenFeedback(count ?? 0));
    recount();
    window.addEventListener(FEEDBACK_CHANGED, recount);
    return () => window.removeEventListener(FEEDBACK_CHANGED, recount);
  }, [isAdmin, isLoggedIn, router.asPath]);

  // The level the backend worked out from the experience collected, and how far through it the
  // player is. Older accounts predate the field, so it stands in as a fresh level 1.
  const {level = 1, intoLevel = 0, forNextLevel = 100} = user?.playerLevel ?? {};
  const levelPercent = forNextLevel ? Math.round((intoLevel / forNextLevel) * 100) : 0;

  // Who is signed in: the same face and name whether or not they are wrapped in a link below.
  const identity = user && (
      <>
        <span className={'nav-user-face'}>
          <Avatar name={user.username || '?'} photo={user.avatar} className={'nav-user-avatar'}/>
          {/* The trophy they chose on their profile, on the rim of their face. It comes with the
              account, so showing it costs no second request. */}
          {user.trophy && (
              <span className={'nav-user-trophy'} data-tooltip={user.trophy.title}
                    data-tooltip-placement={'bottom'}>
                <TrophyBadge trophy={{...user.trophy, earned: true, secret: false}}/>
              </span>
          )}
        </span>
        {/* No username: a placeholder, not the email, which is never shown as a name. */}
        {user.username
            ? <span className={'nav-user-name'}>{user.username}</span>
            : (
                <span className={'nav-user-name'} data-placeholder={'true'}
                      data-tooltip={t('no_username_hint', 'Set a username in your profile')}
                      data-tooltip-placement={'bottom'}>
                  {t('no_username', 'No username')}
                </span>
            )}
      </>
  );

  // Its own row across the foot of the pill, after everything that shares the first one. The bar
  // fills with the experience collected since the level was reached, and the count spells out
  // what is left to the next one.
  const levelLine = user && (
      <span className={'nav-user-level'}>
        <span className={'nav-user-level-badge'}>{t('level_short', 'Lv {{level}}', {level})}</span>
        <span className={'nav-user-level-bar'}
              role={'progressbar'}
              aria-label={t('experience', 'Experience')}
              aria-valuenow={intoLevel}
              aria-valuemin={0}
              aria-valuemax={forNextLevel}
              aria-valuetext={t('level_progress', 'Level {{level}} — {{into}}/{{next}} XP',
                  {level, into: intoLevel, next: forNextLevel})}>
          <span className={'nav-user-level-fill'} style={{width: `${levelPercent}%`}}/>
        </span>
        <span className={'nav-user-level-count'}>{intoLevel}/{forNextLevel} XP</span>
        {/* Only once it is a run: one day in a row is just today. */}
        {user.loginStreak > 1 && (
            <span className={'nav-user-streak'}
                  data-tooltip={t('streak_days', '{{days}} days in a row', {days: user.loginStreak})}>
              <FontAwesomeIcon icon={faFire}/> {user.loginStreak}
            </span>
        )}
        <Link href={'/shop'} className={'nav-user-coins'}
              data-tooltip={t('coins_tooltip', '{{coins}} coins — open the shop', {coins: user.coins ?? 0})}>
          <FontAwesomeIcon icon={faCoins}/> {user.coins ?? 0}
        </Link>
      </span>
  );

  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const signOut = () => {
    setSigningOut(true);
    logout()
        .then(() => router.push('/home'))
        .finally(() => {
          setSigningOut(false);
          setConfirmingSignOut(false);
        });
  };

  useEffect(() => {
    const fetchLanguages = async () => await getLanguages();
    fetchLanguages().then(setLanguages);

    const langId = localStorage.getItem('langId');
    setLanguage(langId);
  }, [isLoggedIn]);

  const handleLanguage = (event) => {
    const value = event.target.value;
    const newLang = languages.find(item => item.langId.toString() === value);

    if (isLoggedIn) {
      const saveNewLanguage = async () => await saveUserLanguage(newLang);
      saveNewLanguage().then(() => setLanguage(newLang.langId));
    }

    localStorage.setItem('langCode', newLang.langCode);
    localStorage.setItem('langId', newLang.langId);

    i18n.changeLanguage(newLang.langCode)
        .then((tFnc) => toast.success(tFnc('saved')));
  }

  const changeLang = (className) =>
      <select className={`lang-select ${className}`} aria-label={t('language', 'Language')}
              data-tooltip={t('language', 'Language')} data-tooltip-placement={'bottom'} onChange={handleLanguage} value={language}>
        {languages?.map(lang =>
            <option key={lang.langId} value={lang.langId}>{lang.langCode}</option>
        )}
      </select>

  // Logged out: language, then Login as the quiet option and Register as the call to action.
  const notLoggedInRender =
      <div className="nav-guest">
        {changeLang('nav-guest-lang')}
        <Link href="/login" className="nav-login"
              aria-current={router.pathname === '/login' ? 'page' : undefined}>{t('login')}</Link>
        <Link href="/register" className="nav-register"
              aria-current={router.pathname === '/register' ? 'page' : undefined}>{t('register')}</Link>
      </div>;

  return (
      <div className="header">
        <div className="nav-start">
          <Link href="/home" className="nav-brand" aria-label="Play Quiz home">
            <Image className="nav-logo" width={100} src="/resources/pq-white-logo.png" alt="Play Quiz" fluid/>
          </Link>
          <MainLinks isLoggedIn={isLoggedIn}/>
          {/* An action rather than a section, so it stands beside the capsule; needs an account. */}
          {isLoggedIn && (
              <Link href="/quiz/create" className="nav-create"
                    aria-current={router.pathname === '/quiz/create' ? 'page' : undefined}
                    // The bar says what the button does; the page it opens says what of.
                    data-tooltip={t('create_quiz', 'Create a quiz')}
                    data-tooltip-placement="bottom">
                <FontAwesomeIcon icon={faWandMagicSparkles}/>
                <span className="nav-link-label">{t('create', 'Create')}</span>
              </Link>
          )}
        </div>
        <SecureComponent
            roles={['ROLE_USER']}
            isAuthenticated={isLoggedIn}
            defaultRender={notLoggedInRender}
        >
          <FlexContainer>
            {/* Registration only asks for an email, so username can still be empty. */}
            {/* The block renders without the user too, so a failed fetch never hides the language picker. */}
            {/* Admins get a golden border instead of a badge. */}
            <span className={'nav-user'} data-admin={isAdmin || undefined}>
              {/* The face and name are the way into the profile settings, for everyone. */}
              {user && (
                  <Link href={'/profile'} className={'nav-user-identity'}
                        data-tooltip={t('profile')} data-tooltip-placement={'bottom'}
                        aria-current={router.pathname.startsWith('/profile') ? 'page' : undefined}>
                    {identity}
                    <span className={'visually-hidden'}>{t('profile')}</span>
                  </Link>
              )}
              {user && <span className={'nav-user-divider'} aria-hidden/>}
              {changeLang('nav-user-lang')}
              <span className={'nav-user-divider'} aria-hidden/>
              {/* The quiz content: categories, glossaries, questions, knowledge base. */}
              {isContentEditor && (
                  <Link href={'/content'} className={'nav-user-action'}
                        aria-label={t('content_dashboard', 'Content dashboard')}
                        data-tooltip={t('content_dashboard', 'Content dashboard')}
                        data-tooltip-placement={'bottom'}
                        aria-current={router.pathname.startsWith('/content') ? 'page' : undefined}>
                    <FontAwesomeIcon icon={faGaugeHigh}/>
                  </Link>
              )}
              <NotificationBell/>
              <Link href={'/quiz/invitations'} className={'nav-user-action'}
                    aria-label={t('quiz_invitations', 'Quiz invitations')}
                    data-tooltip={t('quiz_invitations', 'Quiz invitations')} data-tooltip-placement={'bottom'}
                    aria-current={router.pathname.startsWith('/quiz/invitations') ? 'page' : undefined}>
                <FontAwesomeIcon icon={faEnvelopeOpenText}/>
              </Link>
              <Link href={'/trophies'} className={'nav-user-action'} aria-label={t('trophies', 'Trophies')}
                    data-tooltip={t('trophies', 'Trophies')} data-tooltip-placement={'bottom'}
                    aria-current={router.pathname.startsWith('/trophies') ? 'page' : undefined}>
                <FontAwesomeIcon icon={faTrophy}/>
              </Link>
              <Link href={'/appearance'} className={'nav-user-action'} aria-label={t('appearance', 'Appearance')}
                    data-tooltip={t('appearance', 'Appearance')} data-tooltip-placement={'bottom'}
                    aria-current={router.pathname.startsWith('/appearance') ? 'page' : undefined}>
                <FontAwesomeIcon icon={faPalette}/>
              </Link>
              {/* Admins only: the admin dashboard, with the open-feedback count on the gear. */}
              {isAdmin && (
                  <Link href={openFeedback ? '/admin?tab=feedback' : '/admin'} className={'nav-user-action'}
                        aria-label={openFeedback
                            ? t('admin_dashboard_feedback', '{{name}}, {{count}} open feedback',
                                {name: t('admin_dashboard', 'Admin dashboard'), count: openFeedback})
                            : t('admin_dashboard', 'Admin dashboard')}
                        data-tooltip={openFeedback
                            ? t('open_feedback', '{{count}} open feedback', {count: openFeedback})
                            : t('admin_dashboard', 'Admin dashboard')}
                        data-tooltip-placement={'bottom'}
                        aria-current={router.pathname.startsWith('/admin') ? 'page' : undefined}>
                    <FontAwesomeIcon icon={faGear}/>
                    {openFeedback > 0 && (
                        <span className={'nav-user-badge'} aria-hidden>{openFeedback > 99 ? '99+' : openFeedback}</span>
                    )}
                  </Link>
              )}
              <button type={'button'} className={'nav-user-action'} onClick={() => setConfirmingSignOut(true)}
                      aria-label={t('sign_out')} data-tooltip={t('sign_out')} data-tooltip-placement={'bottom'}
                      aria-haspopup={'dialog'}>
                <FontAwesomeIcon icon={faRightFromBracket}/>
              </button>
              {/* Last, so it wraps onto a row of its own under everything above. */}
              {levelLine}
            </span>
            {/* Not a destructive action, so the popup stays cyan and opens on the confirm button. */}
            <ConfirmDialog open={confirmingSignOut}
                           busy={signingOut}
                           title={t('sign_out_title', 'Sign out?')}
                           message={t('sign_out_confirm', 'You will need to log in again to play and chat.')}
                           confirmLabel={t('sign_out')}
                           onConfirm={signOut}
                           onCancel={() => setConfirmingSignOut(false)}/>
          </FlexContainer>
        </SecureComponent>
      </div>
  );
}

Navbar.propTypes = {
  isLoggedIn: PropTypes.bool,
};

export default Navbar;
