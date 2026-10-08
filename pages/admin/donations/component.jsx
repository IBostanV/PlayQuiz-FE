import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { getDonationSettings, saveDonationSettings } from '../../../api/donation';
import { Field, SaveButton } from '../../../components/admin/form-kit';

// What a fresh setup starts with: the two coins most people send. Rows left without an address
// are dropped on save.
const STARTER_WALLETS = [
  { name: 'Bitcoin', symbol: 'BTC', network: 'Bitcoin', address: '' },
  { name: 'Ethereum', symbol: 'ETH', network: 'Ethereum (ERC-20)', address: '' },
];
const MAX_WALLETS = 10;

// Where donations go, shown on /donate: a PayPal link and/or address, and crypto wallets. The
// server checks the shapes (an https link, addresses of letters and digits) and toasts what it refuses.
export default function DonationsAdmin() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [wallets, setWallets] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDonationSettings().then(settings => {
      setEmail(settings?.paypal?.email ?? '');
      setLink(settings?.paypal?.link ?? '');
      setWallets(settings?.crypto?.length ? settings.crypto : STARTER_WALLETS);
    });
  }, []);

  const change = (index, field, value) =>
    setWallets(list => list.map((wallet, at) => at === index ? { ...wallet, [field]: value } : wallet));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await saveDonationSettings({
        paypal: email.trim() || link.trim() ? { email: email.trim() || null, link: link.trim() || null } : null,
        crypto: wallets
          .map(wallet => ({
            name: wallet.name.trim(),
            symbol: wallet.symbol?.trim() || null,
            network: wallet.network?.trim() || null,
            address: wallet.address.trim(),
          }))
          .filter(wallet => wallet.address),
      });
      if (response) toast.success(t('admin_donation_saved', 'Donation details saved'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form className="shadowed admin-form" onSubmit={submit} noValidate>
      <h4 className="text-center">{t('admin_donations', 'Donations')}</h4>
      <hr/>
      <p className="admin-field-hint">
        {t('admin_donations_intro_before', 'Shown to everyone on the')}{' '}
        <a href="/donate" target="_blank" rel="noreferrer">{t('admin_donations_intro_link', 'Donate')}</a>{' '}
        {t('admin_donations_intro_after', 'page, linked from the footer. Leave a field empty to leave it off the page.')}
      </p>

      <h5>PayPal</h5>
      <Field label={t('admin_paypal_link', 'PayPal link')} htmlFor="donation-paypal-link"
             hint={t('admin_paypal_link_hint', 'A paypal.me link or a PayPal donate button link; it must start with https://')}>
        <Form.Control id="donation-paypal-link" type="url" value={link} placeholder="https://paypal.me/playquiz"
                      onChange={(event) => setLink(event.target.value)}/>
      </Field>
      <Field label={t('admin_paypal_email', 'PayPal email')} htmlFor="donation-paypal-email" hint={t('admin_paypal_email_hint', 'Shown for sending money by address.')}>
        <Form.Control id="donation-paypal-email" type="email" value={email} placeholder="donate@example.com"
                      onChange={(event) => setEmail(event.target.value)}/>
      </Field>

      <h5 className="mt-3">{t('admin_crypto_wallets', 'Crypto wallets')}</h5>
      {wallets.map((wallet, index) => (
        <fieldset key={index} className="d-flex flex-wrap gap-2 align-items-end mb-2">
          <legend className="visually-hidden">{t('admin_wallet_n', 'Wallet {{number}}', { number: index + 1 })}</legend>
          <Field label={t('admin_wallet_coin', 'Coin')} htmlFor={`wallet-name-${index}`}>
            <Form.Control id={`wallet-name-${index}`} value={wallet.name} placeholder="Bitcoin"
                          onChange={(event) => change(index, 'name', event.target.value)}/>
          </Field>
          <Field label={t('admin_wallet_symbol', 'Symbol')} htmlFor={`wallet-symbol-${index}`}>
            <Form.Control id={`wallet-symbol-${index}`} value={wallet.symbol ?? ''} placeholder="BTC"
                          onChange={(event) => change(index, 'symbol', event.target.value)}/>
          </Field>
          <Field label={t('admin_wallet_network', 'Network')} htmlFor={`wallet-network-${index}`}>
            <Form.Control id={`wallet-network-${index}`} value={wallet.network ?? ''} placeholder="Bitcoin"
                          onChange={(event) => change(index, 'network', event.target.value)}/>
          </Field>
          <Field label={t('admin_wallet_address', 'Address')} htmlFor={`wallet-address-${index}`} wide>
            <Form.Control id={`wallet-address-${index}`} value={wallet.address} placeholder="bc1q…"
                          spellCheck={false} autoComplete="off"
                          onChange={(event) => change(index, 'address', event.target.value)}/>
          </Field>
          {/* The admin tables' own delete button, so removing reads the same everywhere. */}
          <button type="button" className="friends-action friends-action-danger admin-wallet-remove"
                  aria-label={t('admin_wallet_remove_row', 'Remove the {{name}} row', { name: wallet.name || t('admin_wallet', 'wallet'), interpolation: { escapeValue: false } })}
                  data-tooltip={t('remove', 'Remove')}
                  onClick={() => setWallets(list => list.filter((_, at) => at !== index))}>
            <FontAwesomeIcon icon={faTrashCan}/>
          </button>
        </fieldset>
      ))}
      {/* Same dashed pill as "Add another answer" on Create quiz. */}
      <button type="button" className="create-quiz-add-answer" disabled={wallets.length >= MAX_WALLETS}
              onClick={() => setWallets(list => [...list, { name: '', symbol: '', network: '', address: '' }])}>
        <FontAwesomeIcon icon={faPlus}/>
        <span>{t('admin_add_wallet', 'Add wallet')}</span>
      </button>

      <div className="admin-form-actions">
        <SaveButton saving={saving}>{t('admin_save_donation_details', 'Save donation details')}</SaveButton>
      </div>
    </Form>
  );
}
