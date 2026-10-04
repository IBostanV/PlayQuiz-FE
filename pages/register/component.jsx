import React, {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/router';
import {fadeToHome} from '../../utils/fade-to-home';
import {authenticate} from '../../api/authentication';
import {REGISTER_URL} from '../../api/constant';
import {toast} from 'react-toastify';
import {useTranslation} from "react-i18next";
import {faEnvelope, faLock, faShieldHalved} from "@fortawesome/free-solid-svg-icons";
import {AuthCard, AuthField, AuthSwitch} from "../../components/auth/auth-card";
import {PasswordStrength} from "../../components/auth/password-strength";
import {checkPassword} from "../../utils/password-strength";

function Register({isLoggedIn}) {
  const router = useRouter();
  const {t} = useTranslation();

  const email = useRef();
  const repass = useRef();
  const password = useRef();
  const [busy, setBusy] = useState(false);
  // Kept as it is typed, for the strength meter; the refs still carry what is submitted.
  const [typed, setTyped] = useState('');
  // The email too: a password made of its name is refused as common.
  const [typedEmail, setTypedEmail] = useState('');
  const [tried, setTried] = useState(false);
  const {ok, verdict} = checkPassword(typed, typedEmail);
  const weak = !ok;

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn]);

  const onSubmit = () => {
    setTried(true);
    // The server refuses it too (PasswordPolicy); this just says so before the round trip.
    if (weak) {
      toast.error(verdict === 'common'
          ? t('password_common_toast', 'That password is too common and easy to guess: choose another.')
          : t('password_not_strong',
              'Choose a stronger password: at least 8 characters, mixing lowercase, uppercase, numbers and symbols.'));
      return;
    }
    // Used to fail silently; say why nothing happened.
    if (password.current.value !== repass.current.value) {
      toast.error(t('passwords_do_not_match', 'Passwords do not match'));
      return;
    }

    setBusy(true);
    authenticate(REGISTER_URL, {
      email: email.current.value,
      password: password.current.value,
      language: {langId: localStorage.getItem('langId'), langCode: localStorage.getItem('langCode')}
    })
      .then((response) => {
        if (response) {
          localStorage.setItem('langCode', response.data.language.langCode);
          localStorage.setItem('langId', parseInt(response.data.language.langId));
          localStorage.setItem('userId', parseInt(response.data.id));

          toast.success(t('account_created', 'Your account has been successfully created.'));
          // Stays busy on the way out: settling back first made the button dip and rise
          // just before the fade.
          fadeToHome(router);
        } else {
          setBusy(false);
        }
      })
      .catch(() => setBusy(false));
  };

  return (
    <AuthCard title={t('register')}
              subtitle={t('register_subtitle', 'Create an account and start playing.')}
              submitLabel={t('register')}
              busy={busy}
              onSubmit={onSubmit}
              footer={<AuthSwitch text={t('have_account', 'Already have an account?')}
                                  href='/login'
                                  linkText={t('login')}/>}>
      <AuthField icon={faEnvelope} label={t('email')} type='email' inputRef={email} autoComplete='email'
                 onInput={(event) => setTypedEmail(event.target.value)}/>
      <AuthField icon={faLock} label={t('password', 'Password')} type='password' inputRef={password}
                 autoComplete='new-password' minLength={8} invalid={tried && weak}
                 onInput={(event) => setTyped(event.target.value)}/>
      <PasswordStrength password={typed} email={typedEmail}/>
      <AuthField icon={faShieldHalved} label={t('repass', 'Repeat password')} type='password' inputRef={repass}
                 autoComplete='new-password'/>
    </AuthCard>
  );
}

export default Register;
