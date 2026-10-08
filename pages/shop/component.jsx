import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faClock, faCoins, faLightbulb, faSnowflake} from '@fortawesome/free-solid-svg-icons';
import {getCurrentUser} from '../../api/user';
import {buyStreakFreeze, COINS_CHANGED, EXTRA_TIME_SECONDS, PRICES, STREAK_FREEZE_MAX} from '../../api/coin';
import {Wardrobe} from '../../components/cosmetic/wardrobe';

// Where coins go. Streak freezes are bought here; hints and extra time are bought inside a quiz,
// where they are used, so they are only described. Laid out like the trophy shelf.
function Shop({isLoggedIn}) {
    const {t} = useTranslation();
    const [user, setUser] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isLoggedIn) return undefined;
        const reload = () => getCurrentUser().then(setUser);
        reload();
        window.addEventListener(COINS_CHANGED, reload);
        return () => window.removeEventListener(COINS_CHANGED, reload);
    }, [isLoggedIn]);

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('shop_sign_in', 'Sign in to earn and spend coins.')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    const coins = user?.coins ?? 0;
    const freezes = user?.streakFreezes ?? 0;
    const buyFreeze = () => {
        setBusy(true);
        buyStreakFreeze().finally(() => setBusy(false));
    };

    return (
        <section className='trophies-page'>
            <header className='trophies-header'>
                <span className='trophies-icon' aria-hidden><FontAwesomeIcon icon={faCoins}/></span>
                <div>
                    <h1 className='trophies-title'>{t('shop', 'Shop')}</h1>
                    <p className='trophies-lead'>
                        {t('shop_balance', 'You have {{coins}} coins. Every 10 XP you earn brings one more.', {coins})}
                    </p>
                </div>
            </header>

            <ul className='shop-list'>
                <li className='shop-item'>
                    <FontAwesomeIcon icon={faSnowflake} className='shop-item-icon'/>
                    <div className='shop-item-text'>
                        <b>{t('streak_freeze', 'Streak freeze')}</b>
                        <span>
                            {t('streak_freeze_text',
                                'Covers one missed day, so your streak goes on. You hold {{held}} of {{max}}.',
                                {held: freezes, max: STREAK_FREEZE_MAX})}
                        </span>
                    </div>
                    <button type='button' className='profile-secondary-button' onClick={buyFreeze}
                            disabled={busy || !user || freezes >= STREAK_FREEZE_MAX || coins < PRICES.STREAK_FREEZE}>
                        <FontAwesomeIcon icon={faCoins}/> {PRICES.STREAK_FREEZE}
                    </button>
                </li>
                <li className='shop-item'>
                    <FontAwesomeIcon icon={faLightbulb} className='shop-item-icon'/>
                    <div className='shop-item-text'>
                        <b>{t('hint_fifty_fifty', '50/50')}</b>
                        <span>{t('hint_text', 'In a quiz, takes away all the wrong options but one. Not in Conquest or challenges.')}</span>
                    </div>
                    <span className='quiz-coin-price'><FontAwesomeIcon icon={faCoins}/> {PRICES.HINT}</span>
                </li>
                <li className='shop-item'>
                    <FontAwesomeIcon icon={faClock} className='shop-item-icon'/>
                    <div className='shop-item-text'>
                        <b>{t('extra_time', '+{{seconds}}s', {seconds: EXTRA_TIME_SECONDS})}</b>
                        <span>{t('extra_time_text', 'In a timed quiz, puts more time on the clock.')}</span>
                    </div>
                    <span className='quiz-coin-price'><FontAwesomeIcon icon={faCoins}/> {PRICES.EXTRA_TIME}</span>
                </li>
            </ul>

            {user && <Wardrobe name={user.username || '?'} photo={user.avatar}/>}
        </section>
    );
}

Shop.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default Shop;
