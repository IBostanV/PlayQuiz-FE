import React, {useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {faKey, faLock, faShieldHalved} from '@fortawesome/free-solid-svg-icons';
import {changePassword, verifyOldPassword} from '../../api/authentication';
import {CHANGE_PASSWORD_URL} from '../../api/constant';
import {AuthField} from '../auth/auth-card';

// Old password (checked as soon as the field is left), new one twice. Success signs the
// user out, so they log back in with the new password.
export const ChangePasswordForm = ({onCancel}) => {
    const router = useRouter();
    const {t} = useTranslation();

    const oldPassword = useRef();
    const password = useRef();
    const repeatPassword = useRef();
    const [oldPasswordValid, setOldPasswordValid] = useState(null);
    const [saving, setSaving] = useState(false);

    const checkOldPassword = () => {
        const value = oldPassword.current.value;
        if (!value) {
            setOldPasswordValid(null);
            return;
        }
        verifyOldPassword({password: value}).then(response => setOldPasswordValid(response === true));
    };

    const submit = (event) => {
        event.preventDefault();
        if (password.current.value !== repeatPassword.current.value) {
            toast.error(t('passwords_do_not_match', 'Passwords do not match'));
            return;
        }
        if (oldPasswordValid === false) {
            toast.error(t('old_password_wrong', 'Old password does not match'));
            return;
        }

        setSaving(true);
        changePassword(CHANGE_PASSWORD_URL, {oldPassword: oldPassword.current.value, password: password.current.value})
            .then(response => {
                if (!response) return;
                // changePassword already dropped the auth cookie; identity goes with it, as on logout.
                localStorage.removeItem('userId');
                toast.success(t('password_changed', 'Password changed. Please log in again.'));
                return router.push('/login');
            })
            .finally(() => setSaving(false));
    };

    return (
        <form className='change-password-form' onSubmit={submit}>
            <p className='popup-message'>
                {t('change_password_hint', "You'll be signed out and log in again with the new password.")}
            </p>
            <div className='auth-fields'>
                <AuthField icon={faKey} label={t('old_password')} type='password' inputRef={oldPassword}
                           autoComplete='current-password' onBlur={checkOldPassword}
                           invalid={oldPasswordValid === false}/>
                <AuthField icon={faLock} label={t('new_password')} type='password' inputRef={password}
                           autoComplete='new-password'/>
                <AuthField icon={faShieldHalved} label={t('retype_new_password')} type='password'
                           inputRef={repeatPassword} autoComplete='new-password'/>
            </div>
            <div className='popup-actions'>
                <button type='button' className='popup-cancel' onClick={onCancel} disabled={saving}>
                    {t('cancel', 'Cancel')}
                </button>
                <button type='submit' className='popup-confirm' disabled={saving}>
                    {saving && <span className='auth-spinner' aria-hidden/>}
                    {t('change_password')}
                </button>
            </div>
        </form>
    );
};

ChangePasswordForm.propTypes = {
    onCancel: PropTypes.func,
};
