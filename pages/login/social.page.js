import React, {useEffect} from 'react';
import {useRouter} from 'next/router';
import {fadeToHome} from '../../utils/fade-to-home';
import {setCookie} from 'cookies-next';
import {toast} from 'react-toastify';
import {useTranslation} from 'react-i18next';
import {getCurrentUser} from '../../api/user';

// What the server gives as the reason a sign-in through a provider was turned away.
const ERRORS = {
    'no-email': ['social_no_email', 'That account did not share a verified email address with us.'],
    unverified: ['social_unverified', 'An account with this email is waiting for its email to be confirmed. Confirm it, then sign in.'],
    blocked: ['social_blocked', 'This account has been blocked.'],
    failed: ['social_failed', 'Signing in did not work. Please try again.'],
};

// Where the server sends the player back after "continue with …". The token comes in the
// fragment (#token=…), which never reaches a server; from here on it is kept exactly as the
// password login keeps it, and the same things are remembered about the player.
function SocialLoginReturn() {
    const router = useRouter();
    const {t} = useTranslation();

    useEffect(() => {
        if (!router.isReady) return;
        const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
        // Out of the address bar and the history at once.
        window.history.replaceState(null, '', window.location.pathname);

        if (!token) {
            const [key, fallback] = ERRORS[router.query.error] ?? ERRORS.failed;
            toast.error(t(key, fallback));
            router.replace('/login');
            return;
        }

        setCookie('authorization', token);
        getCurrentUser().then(account => {
            if (account) {
                localStorage.setItem('langCode', account.language?.langCode);
                localStorage.setItem('langId', parseInt(account.language?.langId));
                localStorage.setItem('userId', parseInt(account.id));
            }
            fadeToHome(router, 'replace');
        });
    }, [router.isReady]);

    return <div className='auth-page'><span className='auth-spinner' aria-label={t('loading', 'Loading')}/></div>;
}

export const getServerSideProps = async () => ({props: {isLoggedIn: false}});

export default SocialLoginReturn;
