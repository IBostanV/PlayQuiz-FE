import React, {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/router';
import {LOGIN_URL} from '../../api/constant';
import validateEmail from '../../utils/validation';
import {authenticate} from '../../api/authentication';
import {toast} from 'react-toastify';
import {useTranslation} from "react-i18next";
import {faEnvelope, faLock} from "@fortawesome/free-solid-svg-icons";
import {fadeToHome} from '../../utils/fade-to-home';
import {AuthCard, AuthField, AuthSwitch} from "../../components/auth/auth-card";

function Login({isLoggedIn}) {
  const router = useRouter();
  const {t} = useTranslation();

  const email = useRef();
  const password = useRef();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      router.push('/home');
    }
  }, [isLoggedIn]);

  const login = () => {
    if (!validateEmail(email.current.value)) {
      toast.error(t('invalid_email', 'Invalid email address'));
      return;
    }

    setBusy(true);
    authenticate(LOGIN_URL, {
      email: email.current.value,
      password: password.current.value
    })
        .then((account) => {
          if (account) {
            localStorage.setItem('langCode', account.data.language.langCode);
            localStorage.setItem('langId', parseInt(account.data.language.langId));
            localStorage.setItem('userId', parseInt(account.data.id));

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
    <AuthCard title={t('login')}
              subtitle={t('login_subtitle', 'Welcome back! Ready for another round?')}
              submitLabel={t('login')}
              busy={busy}
              onSubmit={login}
              footer={<AuthSwitch text={t('no_account', "Don't have an account?")}
                                  href='/register'
                                  linkText={t('register')}/>}>
      <AuthField icon={faEnvelope} label={t('email')} type='email' inputRef={email} autoComplete='email'/>
      <AuthField icon={faLock} label={t('password', 'Password')} type='password' inputRef={password}
                 autoComplete='current-password'/>
    </AuthCard>
  );
}

export default Login;
