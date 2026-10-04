import React, {useEffect} from 'react';
import '../styles/index.scss';
import PropTypes from 'prop-types';
import Layout from '../components/layout';
import {Slide, ToastContainer} from 'react-toastify';
import 'primereact/resources/themes/lara-dark-blue/theme.css';
import 'react-toastify/dist/ReactToastify.css';
import 'swiper/swiper-bundle.css';
import {I18nextProvider, useTranslation} from "react-i18next";
import _i18n_ from '../i18n-config';
import {UserProvider} from "../context/user-context";
import {ChatNotificationsProvider} from "../context/chat-notifications";
import {TooltipLayer} from "../components/common/tooltip";
import {AppearanceProvider, useAppearance} from "../context/appearance";
import {reportError} from "../utils/report-error";

// The toasts come up in the bottom corner the friends dock is not in.
function Toasts() {
  const {settings} = useAppearance();
  return <ToastContainer theme="dark"
                         autoClose="2000"
                         draggable={true}
                         transition={Slide}
                         closeOnClick={true}
                         pauseOnHover={true}
                         position={settings.friendsDock === 'RIGHT' ? 'bottom-left' : 'bottom-right'}
                         hideProgressBar={false}
  />;
}

function Application({ Component, pageProps }) {
  const { isLoggedIn } = pageProps;
  const { i18n } = useTranslation();

    useEffect(() => {
        const userLanguage = localStorage.getItem('langCode');
        if (userLanguage) {
            i18n.changeLanguage(userLanguage).then(() => null);
        }
    }, [isLoggedIn]);

  // Anything thrown outside a request — a handler, a timer, a promise nobody caught.
  useEffect(() => {
    const onError = (event) => reportError('Uncaught error', event.error ?? event.message);
    const onRejection = (event) => reportError('Unhandled promise rejection', event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
      <UserProvider isLoggedIn={isLoggedIn}>
        <AppearanceProvider isLoggedIn={isLoggedIn}>
          <I18nextProvider i18n={_i18n_}>
            <ChatNotificationsProvider isLoggedIn={isLoggedIn}>
              <Layout isLoggedIn={isLoggedIn}>
                  <Component {...pageProps} />
              </Layout>
              {/* Both outside the layout: its page wrapper is transformed while a page swings in,
                  and position: fixed inside a transform pins to the wrapper instead of the screen.
                  It is also remounted per page, which dropped any toast still showing. */}
              <Toasts/>
              {/* Serves every data-tooltip="…" in the app. */}
              <TooltipLayer/>
            </ChatNotificationsProvider>
          </I18nextProvider>
        </AppearanceProvider>
      </UserProvider>
  );
}

Application.propTypes = {
  Component: PropTypes.func,
  pageProps: PropTypes.shape({
    isLoggedIn: PropTypes.bool,
  }),
};

export default Application;
