import React, {useEffect, useState} from 'react';
import Head from 'next/head';
import {useRouter} from 'next/router';
import Navbar from '../navbar';
import {Footer} from '../footer';
import {FriendsPanel} from '../friends/friends-panel';
import PropTypes from 'prop-types';

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
    useEffect(() => {
        const section = (path) => path.split('/')[1];
        const start = (url) => {
            const next = new URL(url, window.location.href).pathname;
            const current = window.location.pathname;
            const betweenChats = section(next) === 'chat' && section(current) === 'chat';
            if (next !== current && !betweenChats) setLeaving(true);
        };
        const end = () => setLeaving(false);
        router.events.on('routeChangeStart', start);
        router.events.on('routeChangeComplete', end);
        router.events.on('routeChangeError', end);
        return () => {
            router.events.off('routeChangeStart', start);
            router.events.off('routeChangeComplete', end);
            router.events.off('routeChangeError', end);
        };
    }, [router.events]);

    return (
        <>
            <Head>
                <title>Play Quiz</title>
                <link rel="icon" href="/resources/favicon.png"/>
            </Head>

            <div className="d-flex flex-column background">
                <Navbar isLoggedIn={isLoggedIn}/>
                <main>
                    <div className='page-transition' key={pathname} data-leaving={leaving || undefined}>
                        {children}
                    </div>
                    {/* Last thing in main, so it can stick to the screen while main is on it and
                        settle at main's end — which is where the footer begins. */}
                    {showFriends && <div className='friends-dock'><FriendsPanel/></div>}
                </main>
                {showFooter && <Footer isLoggedIn={isLoggedIn}/>}
            </div>
        </>
    );
}

Layout.propTypes = {
    children: PropTypes.any,
    isLoggedIn: PropTypes.bool
};

export default Layout;
