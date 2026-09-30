import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faEnvelope, faImage, faXmark} from '@fortawesome/free-solid-svg-icons';
import {Popup} from '../common/popup';
import {sendFeedback} from '../../api/feedback';

// The server's cap (FeedbackInput / Q_FEEDBACK.MESSAGE).
const MAX_MESSAGE = 2000;

// Values are the server's FeedbackType names; i18n keys with their defaults.
export const FEEDBACK_TYPES = [
    {value: 'BUG', label: ['feedback_bug', 'Bug']},
    {value: 'QUESTION', label: ['feedback_question', 'Question']},
    {value: 'SUGGESTION', label: ['feedback_suggestion', 'Suggestion']},
    {value: 'OTHER', label: ['feedback_other', 'Other']},
];

// Write to the admins: what kind of message, the message. The page it was sent from goes along,
// which is often what makes a bug report reproducible. A guest has no account to be answered on,
// so they may leave an address. The Popup mounts the form only while open, so every opening
// starts blank.
const FeedbackForm = ({isLoggedIn, onClose}) => {
    const {t} = useTranslation();
    const router = useRouter();
    const [type, setType] = useState('BUG');
    const [message, setMessage] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [screenshot, setScreenshot] = useState(null);
    const [sending, setSending] = useState(false);

    // Shown while the form is open; revoked with it, so the picture is not held in memory after.
    const preview = screenshot ? URL.createObjectURL(screenshot) : null;
    useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

    const submit = (event) => {
        event.preventDefault();
        if (!message.trim()) return;
        setSending(true);
        sendFeedback({
            type,
            message: message.trim(),
            page: router.asPath,
            contactEmail: !isLoggedIn && contactEmail.trim() ? contactEmail.trim() : undefined,
        }, screenshot ?? undefined)
            .then(sent => {
                if (!sent) return;
                toast.success(t('feedback_sent', 'Thanks! Your message is with the admins.'));
                onClose();
            })
            .finally(() => setSending(false));
    };

    return (
        <form className='feedback-form' onSubmit={submit}>
            <fieldset className='feedback-types'>
                <legend className='visually-hidden'>{t('feedback_type', 'What is it about?')}</legend>
                {FEEDBACK_TYPES.map(option => (
                    <label key={option.value} className='feedback-type'>
                        <input type='radio' name='feedback-type' value={option.value}
                               checked={type === option.value}
                               onChange={() => setType(option.value)}/>
                        <span>{t(...option.label)}</span>
                    </label>
                ))}
            </fieldset>

            <label className='feedback-message'>
                <span className='visually-hidden'>{t('feedback_message', 'Your message')}</span>
                <textarea rows={5} maxLength={MAX_MESSAGE} value={message} autoFocus
                          placeholder={type === 'BUG'
                              ? t('feedback_bug_placeholder', 'What happened, and what did you expect?')
                              : t('feedback_placeholder', 'Your message')}
                          onChange={(event) => setMessage(event.target.value)}/>
                <span className='feedback-count' aria-hidden>{message.length}/{MAX_MESSAGE}</span>
            </label>

            {/* A picture of the problem says more than the description usually can. */}
            <div className={'feedback-screenshot'}>
                <label className={'feedback-screenshot-pick'}>
                    <FontAwesomeIcon icon={faImage}/>
                    <span>{screenshot ? screenshot.name : t('add_screenshot', 'Add a screenshot (optional)')}</span>
                    <input type='file' accept='image/*' className='visually-hidden'
                           onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)}/>
                </label>
                {screenshot && (
                    <button type='button' className='create-quiz-icon-button'
                            onClick={() => setScreenshot(null)}
                            aria-label={t('remove_screenshot', 'Remove the screenshot')}>
                        <FontAwesomeIcon icon={faXmark}/>
                    </button>
                )}
            </div>
            {preview && <img className={'feedback-screenshot-preview'} src={preview} alt=''/>}

            {!isLoggedIn && (
                <label className='feedback-contact'>
                    <span className='feedback-contact-label'>
                        {t('feedback_contact', 'Your email, if you would like an answer (optional)')}
                    </span>
                    <input type='email' value={contactEmail} maxLength={254} autoComplete='email'
                           placeholder={t('email_placeholder', 'name@example.com')}
                           onChange={(event) => setContactEmail(event.target.value)}/>
                </label>
            )}

            <div className='popup-actions'>
                <button type='button' className='popup-cancel' onClick={onClose} disabled={sending}>
                    {t('cancel', 'Cancel')}
                </button>
                <button type='submit' className='popup-confirm' disabled={sending || !message.trim()}>
                    {sending && <span className='auth-spinner' aria-hidden/>}
                    {t('send', 'Send')}
                </button>
            </div>
        </form>
    );
};

export const FeedbackDialog = ({open, isLoggedIn, onClose}) => {
    const {t} = useTranslation();
    return (
        <Popup open={open} icon={faEnvelope} title={t('feedback_title', 'Message the admins')} onClose={onClose}>
            <p className='popup-message'>
                {t('feedback_intro', 'Found a bug, have a question or an idea? Tell us.')}
            </p>
            <FeedbackForm isLoggedIn={isLoggedIn} onClose={onClose}/>
        </Popup>
    );
};

FeedbackDialog.propTypes = {
    open: PropTypes.bool,
    isLoggedIn: PropTypes.bool,
    onClose: PropTypes.func,
};
