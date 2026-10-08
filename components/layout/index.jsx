import React, {useEffect, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import Navbar from '../navbar';
import {Footer} from '../footer';
import {FriendsPanel} from '../friends/friends-panel';
import {SiteTour} from '../tour/site-tour';
import {Announcements} from '../announcement/announcements';
import PropTypes from 'prop-types';
import {hasCookie} from 'cookies-next';

/* eslint-disable-next-line */
function Layout({ children, isLoggedIn }) {
    const router = useRouter();
    const {pathname} = router;
    // Chat and quiz pages are sized to the screen, so they go without the footer; these are the
    // ordinary lists that happen to live under /quiz, and keep it.
    const ordinaryQuizPage =
        ['/quiz/categorized', '/quiz/invitations', '/quiz/my-quizzes'].includes(pathname);
    const showFooter = ordinaryQuizPage || !/^\/(chat|quiz)(\/|$)/.test(pathname);
    // The pages a player reads or browses carry the friends dock in their corner. Not a quiz in
    // progress, and not the chat, which is the friends list by another name.
    const showFriends = isLoggedIn
        && (ordinaryQuizPage || /^\/(home|knowledge-base|content|admin|profile|iq|trophies)(\/|$)/.test(pathname));

    // Going to another page: what is on screen fades away while the next one loads, and the next
    // one swings down into place from its own top edge (.page-transition). Keyed on the route, not
    // the address: a tab switch (?tab=…) is not a page change, and neither is the same page for
    // another id (the next wiki article fades out and back in rather than swinging in). Chat is
    // left out altogether: moving between conversations is one page, and it keeps its connection.
    // ponytail: the fade only lasts as long as the next page takes to load, so an instant one
    // cuts it short; holding the old page on screen until the fade is done would fix that.
    const [leaving, setLeaving] = useState(false);
    const [signedOut, setSignedOut] = useState(false);
    const headerLoggedIn = isLoggedIn && !signedOut;
    useEffect(() => {
        const section = (path) => path.split('/')[1];
        const start = (url) => {
            const next = new URL(url, window.location.href).pathname;
            const current = window.location.pathname;
            const betweenChats = section(next) === 'chat' && section(current) === 'chat';
            if (next !== current && !betweenChats) setLeaving(true);
            // Done with the sign-in fade-in (below); the next page swings in as usual. Not on a
            // ?query change: home stays mounted, and would swing then and there.
            if (next !== current && document.documentElement.getAttribute('data-slide') === 'in') {
                document.documentElement.removeAttribute('data-slide');
            }
        };
        const end = () => {
            setLeaving(false);
            setSignedOut(false);
            // Arrived from a sign-in fade (utils/fade-to-home): the new screen fades up in its place.
            const root = document.documentElement;
            if (root.getAttribute('data-slide') !== 'out') return;
            // Kept until the player moves on: taking it off any sooner gives the page its swing
            // back, and the browser plays it then and there.
            root.setAttribute('data-slide', 'in');
        };
        // Signing out: once the page has faded away the header goes over to signed out, rather than
        // staying signed in over an empty page until home has loaded.
        const faded = () => setSignedOut(!hasCookie('authorization'));
        window.addEventListener('pq:faded', faded);
        router.events.on('routeChangeStart', start);
        router.events.on('routeChangeComplete', end);
        router.events.on('routeChangeError', end);
        return () => {
            window.removeEventListener('pq:faded', faded);
            router.events.off('routeChangeStart', start);
            router.events.off('routeChangeComplete', end);
            router.events.off('routeChangeError', end);
        };
    }, [router.events]);

    return (
        <>
            <Head>
                <title>Play Quiz</title>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <link rel="icon" href="/resources/favicon.png"/>
            </Head>

            <div className="d-flex flex-column background">
                <Navbar isLoggedIn={headerLoggedIn}/>
                <main>
                    <div className='page-transition' key={pathname} data-leaving={leaving || undefined}>
                        {children}
                    </div>
                    {/* Last thing in main, so it can stick to the screen while main is on it and
                        settle at main's end — which is where the footer begins. */}
                    {showFriends && <div className='friends-dock'><FriendsPanel/></div>}
                </main>
                {showFooter && <Footer isLoggedIn={headerLoggedIn}/>}
                <SiteTour isLoggedIn={isLoggedIn}/>
                {headerLoggedIn && <Announcements/>}
            </div>
        </>
    );
}

Layout.propTypes = {
    children: PropTypes.any,
    isLoggedIn: PropTypes.bool
};

export default Layout;
