import React, {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/router';
import {authenticate} from '../../api/authentication';
import {REGISTER_URL} from '../../api/constant';
import {toast} from 'react-toastify';
import {useTranslation} from "react-i18next";
import {faEnvelope, faLock, faShieldHalved} from "@fortawesome/free-solid-svg-icons";
import {AuthCard, AuthField, AuthSwitch} from "../../components/auth/auth-card";

function Register({isLoggedIn}) {
  const router = useRouter();
  const {t} = useTranslation();

  const email = useRef();
  const repass = useRef();
  const password = useRef();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      router.push("/home");
    }
  }, [isLoggedIn]);

  const onSubmit = () => {
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

          toast.success('Your account has been successfully created.');
          router.push('/home');
        }
      })
      .finally(() => setBusy(false));
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
      <AuthField icon={faEnvelope} label={t('email')} type='email' inputRef={email} autoComplete='email'/>
      <AuthField icon={faLock} label={t('password')} type='password' inputRef={password}
                 autoComplete='new-password'/>
      <AuthField icon={faShieldHalved} label={t('repass')} type='password' inputRef={repass}
                 autoComplete='new-password'/>
    </AuthCard>
  );
}

export default Register;
