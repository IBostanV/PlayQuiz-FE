import React, {useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faEye, faEyeSlash} from '@fortawesome/free-solid-svg-icons';

// Shared shell for login and register: logo, title, the fields, one glowing submit and a
// link across to the other page. A real <form>, so Enter submits natively.
export const AuthCard = ({title, subtitle, submitLabel, busy, onSubmit, footer, children}) => (
    <div className='auth-page'>
        <form className='auth-card' onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
        }}>
            <img className='auth-logo' src='/resources/pq-white-logo.png' alt='Play Quiz'/>
            <h1 className='auth-title'>{title}</h1>
            <p className='auth-subtitle'>{subtitle}</p>

            <div className='auth-fields'>{children}</div>

            <button type='submit' className='auth-submit' disabled={busy}>
                {busy ? <span className='auth-spinner' aria-hidden/> : null}
                {submitLabel}
            </button>

            <p className='auth-footer'>{footer}</p>
        </form>
    </div>
);

// Icon, input and a label that floats up once the field has focus or a value
// (placeholder=' ' lets CSS tell an empty field apart via :placeholder-shown).
// Extra props (onBlur, ...) go to the <input>; `invalid` paints the field red.
export const AuthField = ({icon, label, type = 'text', inputRef, autoComplete, invalid, ...inputProps}) => {
    const {t} = useTranslation();
    const [revealed, setRevealed] = useState(false);
    const isPassword = type === 'password';

    return (
        <label className='auth-field' data-invalid={Boolean(invalid)}>
            <FontAwesomeIcon icon={icon} className='auth-field-icon'/>
            <input ref={inputRef}
                   type={isPassword && revealed ? 'text' : type}
                   autoComplete={autoComplete}
                   aria-invalid={Boolean(invalid)}
                   placeholder=' '
                   required
                   {...inputProps}/>
            <span className='auth-field-label'>{label}</span>
            {isPassword && (
                <button type='button'
                        className='auth-reveal'
                        onClick={() => setRevealed(value => !value)}
                        aria-label={revealed ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}
                        aria-pressed={revealed}
                        data-tooltip={revealed ? t('hide_password', 'Hide password') : t('show_password', 'Show password')}>
                    <FontAwesomeIcon icon={revealed ? faEyeSlash : faEye}/>
                </button>
            )}
        </label>
    );
};

export const AuthSwitch = ({text, href, linkText}) => (
    <>
        {text} <Link href={href}>{linkText}</Link>
    </>
);

AuthCard.propTypes = {
    title: PropTypes.node,
    subtitle: PropTypes.node,
    submitLabel: PropTypes.node,
    busy: PropTypes.bool,
    onSubmit: PropTypes.func,
    footer: PropTypes.node,
    children: PropTypes.node,
};

AuthField.propTypes = {
    icon: PropTypes.object,
    label: PropTypes.node,
    type: PropTypes.string,
    inputRef: PropTypes.object,
    autoComplete: PropTypes.string,
    invalid: PropTypes.bool,
};

AuthSwitch.propTypes = {
    text: PropTypes.node,
    href: PropTypes.string,
    linkText: PropTypes.node,
};
