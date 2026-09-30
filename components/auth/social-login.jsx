import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFacebook, faGithub, faGoogle, faReddit} from '@fortawesome/free-brands-svg-icons';
import {axiosInstance} from '../../utils/request';
import {SOCIAL_PROVIDERS_URL} from '../../api/constant';

const PROVIDERS = {
    google: {icon: faGoogle, name: 'Google'},
    github: {icon: faGithub, name: 'GitHub'},
    facebook: {icon: faFacebook, name: 'Facebook'},
    reddit: {icon: faReddit, name: 'Reddit'},
};

// "Sign in with …", for the providers the server has keys for (it says which). Each is a plain
// link, not a request: the browser leaves for the provider and comes back to /login/social.
export const SocialLogin = () => {
    const {t} = useTranslation();
    const [providers, setProviders] = useState([]);

    // Straight through axios, not request(): that one toasts every failure, and a server that
    // cannot say (an older one, or down) should just mean no buttons, not an error on the login page.
    useEffect(() => {
        axiosInstance.get(SOCIAL_PROVIDERS_URL)
            .then(({data}) => setProviders(Array.isArray(data) ? data : []))
            .catch(() => setProviders([]));
    }, []);

    const shown = providers.filter(id => PROVIDERS[id]);
    if (!shown.length) return null;

    return (
        <div className='auth-social'>
            <span className='auth-social-divider'>{t('or_continue_with', 'or continue with')}</span>
            <div className='auth-social-buttons'>
                {shown.map(id => (
                    <a key={id}
                       className='auth-social-button'
                       data-provider={id}
                       href={`${process.env.NEXT_PUBLIC_BE_HOST_URL}/oauth2/authorization/${id}`}
                       aria-label={t('continue_with', 'Continue with {{provider}}', {provider: PROVIDERS[id].name})}
                       data-tooltip={PROVIDERS[id].name}>
                        <FontAwesomeIcon icon={PROVIDERS[id].icon}/>
                    </a>
                ))}
            </div>
        </div>
    );
};
