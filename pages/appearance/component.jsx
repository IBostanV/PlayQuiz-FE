import React, {useRef, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faPalette, faRotateLeft, faSpinner, faTrash, faUpload} from '@fortawesome/free-solid-svg-icons';
import {toast} from 'react-toastify';
import {accentTextFor, APPEARANCE_DEFAULTS, DEFAULT_ACCENT, useAppearance} from '../../context/appearance';
import {ConfirmDialog} from '../../components/common/popup';
import {LanguageSelect} from '../../components/common/language-select';
import {
    customBackgroundUrl, presetBackgroundUrl, removeBackground, uploadBackground,
} from '../../api/user/appearance';
import {shrinkImage} from '../../utils/shrink-image';

// A few accents to pick from, the site's own first; the picker beside them takes any other.
const ACCENTS = [
    [null, 'accent_default', 'Cyan (default)', DEFAULT_ACCENT],
    ['#8b5cf6', 'accent_violet', 'Violet'],
    ['#10b981', 'accent_emerald', 'Emerald'],
    ['#f59e0b', 'accent_amber', 'Amber'],
    ['#f43f5e', 'accent_rose', 'Rose'],
    ['#84cc16', 'accent_lime', 'Lime'],
];

// Text on the accent. Automatic is the site's own colours, turning dark on a very light accent.
const ACCENT_TEXTS = [
    [null, 'accent_text_auto', 'Automatic (default)'],
    ['#ffffff', 'accent_text_white', 'White'],
    ['#04121c', 'accent_text_dark', 'Dark'],
    ['#000000', 'accent_text_black', 'Black'],
];

// The site's own backgrounds (public/backgrounds); the server keeps the same list.
const BACKGROUNDS = [
    ['aurora', 'background_aurora', 'Aurora'],
    ['constellation', 'background_constellation', 'Constellation'],
    ['topography', 'background_topography', 'Topography'],
    ['waves', 'background_waves', 'Waves'],
    ['hexagons', 'background_hexagons', 'Honeycomb'],
    ['dunes', 'background_dunes', 'Dunes'],
];

// What a picked file may be before it is even opened: decoding a huge one would take the tab's
// memory with it. It is scaled and compressed well under the server's limit after.
const UPLOAD_TYPES = /^image\/(jpeg|png|webp)$/;
const MAX_PICKED_BYTES = 30 * 1024 * 1024;

const TEXT_SIZES = [
    [90, 'text_small', 'Small'],
    [null, 'text_default', 'Default'],
    [110, 'text_large', 'Large'],
    [125, 'text_larger', 'Larger'],
];

const MOTION = [
    [null, 'motion_system', 'Follow my system (default)'],
    ['ON', 'motion_on', 'Always animate'],
    ['OFF', 'motion_off', 'Never animate'],
];

const FRIENDS_DOCK = [
    [null, 'dock_left', 'Bottom left (default)'],
    ['RIGHT', 'dock_right', 'Bottom right'],
];

const HOME_FRIENDS = [
    [null, 'home_friends_right', 'Right of the news (default)'],
    ['LEFT', 'home_friends_left', 'Left of the news'],
    ['BELOW', 'home_friends_below', 'Under the news'],
];

// One setting: its name, what it does, the control, and a way back to how the site comes.
const Setting = ({title, hint, changed, onReset, children}) => {
    const {t} = useTranslation();

    return (
        <section className='appearance-setting'>
            <div className='appearance-setting-head'>
                <div>
                    <h2 className='appearance-setting-title'>{title}</h2>
                    {hint && <p className='appearance-setting-hint'>{hint}</p>}
                </div>
                {changed && (
                    <button type='button' className='appearance-reset' onClick={onReset}>
                        <FontAwesomeIcon icon={faRotateLeft}/> {t('reset', 'Reset')}
                    </button>
                )}
            </div>
            {children}
        </section>
    );
};

Setting.propTypes = {
    title: PropTypes.string.isRequired,
    hint: PropTypes.string,
    changed: PropTypes.bool,
    onReset: PropTypes.func.isRequired,
    children: PropTypes.node,
};

// A row of mutually exclusive choices; null stands for the site as it comes.
const Choices = ({name, options, value, onChange}) => {
    const {t} = useTranslation();

    return (
        <div className='appearance-choices' role='radiogroup'>
            {options.map(([option, key, fallback]) => (
                <label key={key} className='appearance-choice' data-selected={value === option || undefined}>
                    <input type='radio' name={name} className='visually-hidden'
                           checked={value === option} onChange={() => onChange(option)}/>
                    {t(key, fallback)}
                </label>
            ))}
        </div>
    );
};

Choices.propTypes = {
    name: PropTypes.string.isRequired,
    options: PropTypes.array.isRequired,
    value: PropTypes.any,
    onChange: PropTypes.func.isRequired,
};

// One background to pick: its picture, and its name for screen readers and the tooltip.
const BackgroundChoice = ({label, selected, onPick, children}) => (
    <button type='button' role='radio' aria-checked={selected} className='appearance-background'
            aria-label={label} data-tooltip={label} onClick={onPick}>
        {children}
        {selected && <span className='appearance-background-check' aria-hidden><FontAwesomeIcon icon={faCheck}/></span>}
    </button>
);

BackgroundChoice.propTypes = {
    label: PropTypes.string.isRequired,
    selected: PropTypes.bool,
    onPick: PropTypes.func.isRequired,
    children: PropTypes.node,
};

// How the site looks for this player alone: every change shows at once and is kept on their
// account. Each setting can go back to how the site comes, or all of them at once.
function Appearance({isLoggedIn}) {
    const {t} = useTranslation();
    const {settings, preview, update, adopt} = useAppearance();
    const [confirmingReset, setConfirmingReset] = useState(false);
    const [uploading, setUploading] = useState(false);
    // React's onChange on a colour input fires on every movement of the picker, not when it
    // closes: the colour shows at once and is saved once it has settled.
    const colourTimer = useRef(null);
    const pickColour = (key) => (colour) => {
        preview({[key]: colour});
        clearTimeout(colourTimer.current);
        colourTimer.current = setTimeout(() => update({[key]: colour}), 500);
    };

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('appearance_sign_in', 'Sign in to change how the site looks for you.')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    // Scaled and compressed here first: what goes up is a few hundred KB, whatever was picked.
    const upload = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (!UPLOAD_TYPES.test(file.type) || file.size > MAX_PICKED_BYTES) {
            toast.error(t('background_bad_file', 'Pick a JPEG, PNG or WebP picture under 30 MB'));
            return;
        }
        setUploading(true);
        try {
            const image = await shrinkImage(file);
            if (!image) {
                toast.error(t('background_too_big', 'That picture could not be made small enough'));
                return;
            }
            adopt(await uploadBackground(image));
        } catch {
            toast.error(t('background_unreadable', 'That picture could not be read'));
        } finally {
            setUploading(false);
        }
    };

    const set = (key) => (value) => update({[key]: value});
    const reset = (key) => () => update({[key]: null});
    // The uploaded picture is kept until it is deleted: having one is not a change in itself.
    const anyChanged = Object.entries(settings).some(([key, value]) => key !== 'customBackground' && value != null);
    const accent = settings.accent ?? DEFAULT_ACCENT;
    const custom = settings.accent && !ACCENTS.some(([value]) => value === settings.accent);
    // What the text on the accent is right now, automatic included, for the swatches to show.
    const accentText = accentTextFor(settings) ?? '#ffffff';
    const customText = settings.accentText && !ACCENT_TEXTS.some(([value]) => value === settings.accentText);

    return (
        <section className='appearance-page'>
            <header className='trophies-header'>
                <span className='news-icon' aria-hidden><FontAwesomeIcon icon={faPalette}/></span>
                <div>
                    <h1 className='trophies-title'>{t('appearance', 'Appearance')}</h1>
                    <p className='trophies-lead'>
                        {t('appearance_lead', 'Make the site yours. Changes show at once and are only for you.')}
                    </p>
                </div>
            </header>

            <Setting title={t('accent_colour', 'Accent colour')}
                     hint={t('accent_colour_hint', 'The colour of buttons, links, highlights and glows.')}
                     changed={Boolean(settings.accent)} onReset={reset('accent')}>
                <div className='appearance-swatches' role='radiogroup' aria-label={t('accent_colour', 'Accent colour')}>
                    {ACCENTS.map(([value, key, fallback, shown]) => {
                        const selected = settings.accent === value;
                        return (
                            <button key={key} type='button' role='radio' aria-checked={selected}
                                    className='appearance-swatch' style={{background: shown ?? value}}
                                    aria-label={t(key, fallback)} data-tooltip={t(key, fallback)}
                                    onClick={() => update({accent: value})}>
                                {selected && <FontAwesomeIcon icon={faCheck}/>}
                            </button>
                        );
                    })}
                    {/* Any other colour: shown while it is dragged about, kept once it settles. */}
                    <label className='appearance-swatch appearance-swatch-custom' data-selected={custom || undefined}
                           data-tooltip={t('accent_custom', 'Pick your own')}>
                        <input type='color' value={accent} aria-label={t('accent_custom', 'Pick your own')}
                               onChange={event => pickColour('accent')(event.target.value)}/>
                    </label>
                </div>
            </Setting>

            <Setting title={t('accent_text', 'Text on the accent')}
                     hint={t('accent_text_hint', 'The colour of the words on buttons and highlights. Pick one that reads on your accent.')}
                     changed={Boolean(settings.accentText)} onReset={reset('accentText')}>
                {/* Each swatch is the accent with its text colour on it: what a button would look like. */}
                <div className='appearance-swatches' role='radiogroup' aria-label={t('accent_text', 'Text on the accent')}>
                    {ACCENT_TEXTS.map(([value, key, fallback]) => (
                        <button key={key} type='button' role='radio' aria-checked={settings.accentText === value}
                                className='appearance-swatch appearance-swatch-text'
                                style={{background: accent, color: value ?? accentTextFor({...settings, accentText: null}) ?? '#ffffff'}}
                                aria-label={t(key, fallback)} data-tooltip={t(key, fallback)}
                                onClick={() => update({accentText: value})}>
                            Aa
                        </button>
                    ))}
                    <label className='appearance-swatch appearance-swatch-custom' data-selected={customText || undefined}
                           data-tooltip={t('accent_text_custom', 'Pick your own')}>
                        <input type='color' value={accentText} aria-label={t('accent_text_custom', 'Pick your own')}
                               onChange={event => pickColour('accentText')(event.target.value)}/>
                    </label>
                </div>
            </Setting>

            <Setting title={t('background', 'Background')}
                     hint={t('background_hint', 'The picture behind the site. Your own is scaled down and compressed before it is uploaded.')}
                     changed={settings.background != null} onReset={reset('background')}>
                <div className='appearance-backgrounds' role='radiogroup' aria-label={t('background', 'Background')}>
                    <BackgroundChoice label={t('background_logo', 'Logo (default)')} selected={!settings.background}
                                      onPick={() => update({background: null})}>
                        <img className='appearance-background-logo' src='/resources/favicon.png' alt=''/>
                    </BackgroundChoice>
                    {BACKGROUNDS.map(([name, key, fallback]) => (
                        <BackgroundChoice key={name} label={t(key, fallback)} selected={settings.background === name}
                                          onPick={() => update({background: name})}>
                            <img src={presetBackgroundUrl(name)} alt='' loading='lazy' decoding='async'/>
                        </BackgroundChoice>
                    ))}
                    {settings.customBackground && (
                        <div className='appearance-background-own'>
                            <BackgroundChoice label={t('background_custom', 'Your picture')}
                                              selected={settings.background === 'custom'}
                                              onPick={() => update({background: 'custom'})}>
                                <img src={customBackgroundUrl(settings.customBackground)} alt='' loading='lazy' decoding='async'/>
                            </BackgroundChoice>
                            <button type='button' className='appearance-background-remove'
                                    aria-label={t('background_remove', 'Delete your picture')}
                                    data-tooltip={t('background_remove', 'Delete your picture')}
                                    onClick={() => removeBackground().then(adopt)}>
                                <FontAwesomeIcon icon={faTrash}/>
                            </button>
                        </div>
                    )}
                    <label className='appearance-background appearance-background-upload' data-busy={uploading || undefined}>
                        <input type='file' accept='image/jpeg,image/png,image/webp' className='visually-hidden'
                               disabled={uploading} onChange={upload}/>
                        <span className='appearance-background-upload-icon' aria-hidden>
                            <FontAwesomeIcon icon={uploading ? faSpinner : faUpload} spin={uploading}/>
                        </span>
                        <span className='appearance-background-upload-label'>
                            {uploading ? t('background_uploading', 'Uploading…')
                                : settings.customBackground ? t('background_replace', 'Replace your picture')
                                    : t('background_upload', 'Upload a picture')}
                        </span>
                    </label>
                </div>
            </Setting>

            <Setting title={t('language', 'Language')}
                     hint={t('language_hint', 'For the whole site, and for what the server writes to you.')}>
                <LanguageSelect isLoggedIn={isLoggedIn} field className='appearance-language'/>
            </Setting>

            <Setting title={t('text_size', 'Text size')}
                     hint={t('text_size_hint', 'For all the text on the site.')}
                     changed={settings.textSize != null} onReset={reset('textSize')}>
                <Choices name='text-size' options={TEXT_SIZES} value={settings.textSize} onChange={set('textSize')}/>
            </Setting>

            <Setting title={t('motion', 'Motion')}
                     hint={t('motion_hint', 'Animations, page transitions and hover effects. By default the site follows your system: with its animation effects off, so is the motion here.')}
                     changed={settings.motion != null} onReset={reset('motion')}>
                <Choices name='motion' options={MOTION} value={settings.motion} onChange={set('motion')}/>
            </Setting>

            <Setting title={t('navigation', 'Navigation')}
                     changed={settings.compactNav != null} onReset={reset('compactNav')}>
                <label className='appearance-toggle'>
                    <input type='checkbox' checked={Boolean(settings.compactNav)}
                           onChange={event => update({compactNav: event.target.checked || null})}/>
                    {t('compact_nav', 'Icons only in the main menu')}
                </label>
            </Setting>

            <Setting title={t('site_tour', 'Site tour')}
                     hint={t('hide_tour_link_hint', 'With the compass hidden, the tour can still be opened at /home?tour.')}
                     changed={settings.hideTourLink != null} onReset={reset('hideTourLink')}>
                <label className='appearance-toggle'>
                    <input type='checkbox' checked={Boolean(settings.hideTourLink)}
                           onChange={event => update({hideTourLink: event.target.checked || null})}/>
                    {t('hide_tour_link', 'Hide the site tour button in the menu')}
                </label>
            </Setting>

            <Setting title={t('friends_panel', 'Friends panel')}
                     hint={t('friends_panel_hint', 'Which corner your friends list sits in. Notifications pop up in the other one.')}
                     changed={settings.friendsDock != null} onReset={reset('friendsDock')}>
                <Choices name='friends-dock' options={FRIENDS_DOCK} value={settings.friendsDock} onChange={set('friendsDock')}/>
            </Setting>

            <Setting title={t('home_friends', "Friends' news on the home page")}
                     changed={settings.homeFriends != null} onReset={reset('homeFriends')}>
                <Choices name='home-friends' options={HOME_FRIENDS} value={settings.homeFriends} onChange={set('homeFriends')}/>
            </Setting>

            <div className='appearance-actions'>
                <button type='button' className='profile-secondary-button' disabled={!anyChanged}
                        onClick={() => setConfirmingReset(true)}>
                    <FontAwesomeIcon icon={faRotateLeft}/> {t('reset_all', 'Reset everything')}
                </button>
            </div>

            <ConfirmDialog open={confirmingReset}
                           title={t('reset_all_title', 'Reset the appearance?')}
                           message={t('reset_all_confirm', 'Every setting on this page goes back to how the site comes.')}
                           confirmLabel={t('reset_all', 'Reset everything')}
                           onConfirm={() => update(APPEARANCE_DEFAULTS).finally(() => setConfirmingReset(false))}
                           onCancel={() => setConfirmingReset(false)}/>
        </section>
    );
}

Appearance.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default Appearance;
