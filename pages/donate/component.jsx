import React, {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faCopy, faHandHoldingHeart, faWallet} from '@fortawesome/free-solid-svg-icons';
import {faBitcoin, faEthereum, faPaypal} from '@fortawesome/free-brands-svg-icons';
import {QRCodeSVG} from 'qrcode.react';
import {getDonationSettings} from '../../api/donation';

// Brand marks for the coins Font Awesome has one for; any other wallet gets a plain one.
const COIN_ICONS = {BTC: faBitcoin, ETH: faEthereum};

// One wallet: what it is, which network, and the address to scan or copy (an address is never
// typed by hand). The code holds the bare address, which every wallet app reads, whatever the coin.
const Wallet = ({wallet}) => {
    const {t} = useTranslation();
    const [copied, setCopied] = useState(false);

    const copy = () => navigator.clipboard?.writeText(wallet.address).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    });

    return (
        <li className='donate-wallet'>
            <span className='donate-wallet-icon' aria-hidden>
                <FontAwesomeIcon icon={COIN_ICONS[wallet.symbol?.toUpperCase()] ?? faWallet}/>
            </span>
            <div className='donate-wallet-body'>
                <p className='donate-wallet-name'>
                    {wallet.name}
                    {wallet.symbol && <span className='donate-wallet-symbol'>{wallet.symbol}</span>}
                </p>
                {wallet.network && (
                    <p className='donate-wallet-network'>
                        {t('donate_network', 'Network: {{network}}', {network: wallet.network})}
                    </p>
                )}
                <code className='donate-wallet-address'>{wallet.address}</code>
            </div>
            <QRCodeSVG value={wallet.address} size={104} marginSize={2} className='donate-qr'
                       title={t('qr_for', 'QR code for the {{name}} address', {name: wallet.name})}/>
            <button type='button' className='donate-copy' onClick={copy}
                    aria-label={t('copy_address', 'Copy the {{name}} address', {name: wallet.name})}>
                <FontAwesomeIcon icon={copied ? faCheck : faCopy}/>
                <span>{copied ? t('copied', 'Copied') : t('copy', 'Copy')}</span>
            </button>
        </li>
    );
};

// Donations: PayPal and crypto wallets, whatever the admins set up (admin dashboard, Donations).
function Donate() {
    const {t} = useTranslation();
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        getDonationSettings().then(result => setSettings(result ?? {crypto: []}));
    }, []);

    const paypal = settings?.paypal;
    const wallets = settings?.crypto ?? [];

    return (
        <section className='donate-page'>
            <header className='donate-header'>
                <span className='donate-icon' aria-hidden><FontAwesomeIcon icon={faHandHoldingHeart}/></span>
                <div>
                    <h1 className='donate-title'>{t('donate', 'Donate')}</h1>
                    <p className='donate-lead'>
                        {t('donate_lead', 'Play Quiz is free and has no ads. If you enjoy it, a donation keeps the servers running and new questions coming.')}
                    </p>
                </div>
            </header>

            {/* The code is PayPal's own, saved in public/resources, so it is there whatever the
                admins set up. The link stays beside it: on a phone there is no second screen to
                scan from. */}
            <div className='donate-section'>
                <h2 className='donate-section-title'><FontAwesomeIcon icon={faPaypal}/> PayPal</h2>
                <p className='donate-lead'>{t('donate_paypal_scan', 'Scan the code with your phone to donate with PayPal.')}</p>
                <img className='donate-paypal-qr' src='/resources/qrcode.png' width={260} height={260}
                     alt={t('donate_paypal_qr', 'PayPal donation QR code')}/>
                {paypal?.link && (
                    <a className='donate-paypal' href={paypal.link} target='_blank' rel='noopener noreferrer'>
                        <FontAwesomeIcon icon={faPaypal}/> {t('donate_with_paypal', 'Donate with PayPal')}
                    </a>
                )}
                {paypal?.email && (
                    <p className='donate-lead'>
                        {t('donate_paypal_email', 'Or send to')} <code className='donate-wallet-address'>{paypal.email}</code>
                    </p>
                )}
            </div>

            {wallets.length > 0 && (
                <div className='donate-section'>
                    <h2 className='donate-section-title'><FontAwesomeIcon icon={faWallet}/> {t('donate_crypto', 'Crypto')}</h2>
                    <p className='donate-lead'>
                        {t('donate_crypto_hint', 'Send only that coin, on that network, to its address: anything else is lost.')}
                    </p>
                    <ul className='donate-wallets'>
                        {wallets.map(wallet => <Wallet key={wallet.address} wallet={wallet}/>)}
                    </ul>
                </div>
            )}
        </section>
    );
}

export default Donate;
