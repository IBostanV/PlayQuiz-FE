import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faFlag} from '@fortawesome/free-solid-svg-icons';
import {Popup} from '../common/popup';
import {sendFeedback} from '../../api/feedback';

// The server's cap (FeedbackInput.question / Q_FEEDBACK.QUESTION).
const MAX_QUESTION = 1100;

// `message` is what the admins read (their dashboard is in English); `label` what the player sees.
const REASONS = [
    {value: 'WRONG_ANSWER', message: 'Wrong or missing right answer', label: ['report_wrong_answer', 'Wrong answer']},
    {value: 'TYPO', message: 'Typo or bad wording', label: ['report_typo', 'Typo']},
    {value: 'UNCLEAR', message: 'Unclear question', label: ['report_unclear', 'Unclear']},
    {value: 'OTHER', message: 'Other problem', label: ['report_other', 'Other']},
];

// Mounted only while the popup is open, so every report starts blank. `question` is the one the
// player opened the report on, kept even if the quiz has moved on by the time they send it.
const ReportForm = ({question, custom, onDone, onCancel}) => {
    const {t} = useTranslation();
    const router = useRouter();
    const [reason, setReason] = useState('WRONG_ANSWER');
    const [details, setDetails] = useState('');
    // A question the player just called broken is not worth answering, so skipping is the default;
    // for a small slip (a typo) they may still want to answer it.
    const [skip, setSkip] = useState(true);
    const [sending, setSending] = useState(false);

    const submit = (event) => {
        event.preventDefault();
        const picked = REASONS.find(option => option.value === reason);
        setSending(true);
        sendFeedback({
            type: 'BUG',
            message: details.trim() ? `${picked.message}: ${details.trim()}` : picked.message,
            page: router.asPath,
            question: `${custom ? 'Custom question' : 'Question'} #${question.id}: ${question.content}`.slice(0, MAX_QUESTION),
        })
            .then(sent => {
                // Not sent (e.g. too many reports): the player stays on the question.
                if (!sent) return;
                toast.success(t('report_sent', 'Thanks! The admins will look at this question.'));
                onDone(skip);
            })
            .finally(() => setSending(false));
    };

    return (
        <form className='feedback-form' onSubmit={submit}>
            <p className='report-question-text'>“{question.content}”</p>

            <fieldset className='feedback-types'>
                <legend className='visually-hidden'>{t('report_reason', 'What is wrong?')}</legend>
                {REASONS.map(option => (
                    <label key={option.value} className='feedback-type'>
                        <input type='radio' name='report-reason' value={option.value}
                               checked={reason === option.value}
                               onChange={() => setReason(option.value)}/>
                        <span>{t(...option.label)}</span>
                    </label>
                ))}
            </fieldset>

            <label className='feedback-message'>
                <span className='visually-hidden'>{t('report_details', 'Details')}</span>
                <textarea rows={3} maxLength={1500} value={details}
                          placeholder={t('report_details_placeholder', 'Details (optional), e.g. what the right answer should be')}
                          onChange={(event) => setDetails(event.target.value)}/>
            </label>

            <label className='report-skip'>
                <input type='checkbox' checked={skip} onChange={(event) => setSkip(event.target.checked)}/>
                <span>{t('report_skip', 'Skip this question')}</span>
            </label>

            <div className='popup-actions'>
                <button type='button' className='popup-cancel' onClick={onCancel} disabled={sending}>
                    {t('cancel', 'Cancel')}
                </button>
                <button type='submit' className='popup-confirm' disabled={sending}>
                    {sending && <span className='auth-spinner' aria-hidden/>}
                    {t('report', 'Report')}
                </button>
            </div>
        </form>
    );
};

/**
 * "Report a problem" under a quiz question: tells the admins what is wrong with it and, if the
 * player keeps "Skip this question" ticked, calls onSkip with that question's id. The quiz decides
 * whether that question is still the one on screen (a timer may have moved on meanwhile). A skipped
 * question is left unanswered: the results show it with its right answer, like one that timed out.
 * `custom` marks a question from a player-made quiz, kept in its own table.
 */
export const ReportQuestion = ({question, custom = false, onSkip}) => {
    const {t} = useTranslation();
    // Snapshot of the question at the moment the report opened.
    const [reported, setReported] = useState(null);

    return (
        <>
            <button type='button' className='quiz-report' aria-haspopup='dialog'
                    onClick={() => setReported({id: question.id, content: question.content})}>
                <FontAwesomeIcon icon={faFlag}/>
                <span>{t('report_question', 'Report a problem')}</span>
            </button>
            <Popup open={Boolean(reported)} icon={faFlag} title={t('report_question_title', 'Report this question')}
                   onClose={() => setReported(null)}>
                {reported && (
                    <ReportForm question={reported}
                                custom={custom}
                                onCancel={() => setReported(null)}
                                onDone={(skip) => {
                                    setReported(null);
                                    if (skip) onSkip(reported.id);
                                }}/>
                )}
            </Popup>
        </>
    );
};

ReportQuestion.propTypes = {
    question: PropTypes.shape({id: PropTypes.number, content: PropTypes.string}).isRequired,
    custom: PropTypes.bool,
    onSkip: PropTypes.func.isRequired,
};
