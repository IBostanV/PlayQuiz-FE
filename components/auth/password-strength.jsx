import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {checkPassword} from '../../utils/password-strength';

const VERDICTS = {
    short: ['password_too_short', 'Too short — at least 8 characters'],
    weak: ['password_weak', 'Weak — mix lowercase, uppercase, numbers and symbols'],
    common: ['password_common', 'Too common — easy to guess'],
    good: ['password_good', 'Good'],
    strong: ['password_strong', 'Strong'],
};

// Four bars that fill and change colour as the password gets stronger, and what it still needs.
export const PasswordStrength = ({password, email}) => {
    const {t} = useTranslation();
    const {level, verdict} = checkPassword(password, email);
    if (!verdict) return null;
    const [key, fallback] = VERDICTS[verdict];

    return (
        <div className='password-strength' data-level={level} aria-live='polite'>
            <div className='password-strength-bars' aria-hidden>
                {[1, 2, 3, 4].map(bar => <span key={bar} data-on={bar <= level}/>)}
            </div>
            <span className='password-strength-label'>{t(key, fallback)}</span>
        </div>
    );
};

PasswordStrength.propTypes = {
    password: PropTypes.string,
    email: PropTypes.string,
};
