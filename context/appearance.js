import React, {createContext, useContext, useEffect, useState} from 'react';
import {getAppearance, saveAppearance} from '../api/user/appearance';
import {useClientLayoutEffect} from '../hooks/client-layout-effect';

// Every setting a player can change, at the site as it comes. Null is "not changed".
export const APPEARANCE_DEFAULTS = {
    accent: null,
    accentText: null,
    textSize: null,
    motion: null,
    compactNav: null,
    friendsDock: null,
    homeFriends: null,
};

// The accent as it comes, for the colour picker to start from.
export const DEFAULT_ACCENT = '#00a8e8';

// The text on the accent when the player has not picked one but their accent is too light for
// the site's white: the dark the round icons already use.
export const DARK_ACCENT_TEXT = '#04121c';

// Relative luminance (WCAG), 0 black to 1 white. Past 0.6 white text stops reading on it; the
// site's own swatches all sit below that, so they keep the white they always had.
const isLight = (hex) => {
    const [r, g, b] = [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
};

// The colour of text on the accent (buttons, active pills, the round icons): the player's pick,
// or dark on an accent too light for white, or null for each rule's own colour.
export const accentTextFor = (settings) => settings.accentText
    ?? (settings.accent && isLight(settings.accent) ? DARK_ACCENT_TEXT : null);

// Kept in the browser as well, so the next page load looks right before the server has answered.
const CACHE_KEY = 'appearance';

const AppearanceContext = createContext({
    settings: APPEARANCE_DEFAULTS,
    preview: () => undefined,
    update: () => Promise.resolve(),
});

export const useAppearance = () => useContext(AppearanceContext);

const hexToRgb = (hex) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16)).join(', ');

const toggle = (root, name, on) => (on ? root.setAttribute(name, '') : root.removeAttribute(name));

// Everything happens on <html>: a variable for the colour, the font size for the text (the
// stylesheet sizes text in rem), and data attributes the stylesheet reads for the rest.
const apply = (settings) => {
    const root = document.documentElement;

    toggle(root, 'data-accent', Boolean(settings.accent));
    if (settings.accent) root.style.setProperty('--ui-accent-rgb', hexToRgb(settings.accent));
    else root.style.removeProperty('--ui-accent-rgb');

    const accentText = accentTextFor(settings);
    if (accentText) root.style.setProperty('--ui-on-accent', accentText);
    else root.style.removeProperty('--ui-on-accent');
    // Text drawn in the accent itself on the dark header and footer (their icons, links, the page
    // you are on) takes the player's colour too — but only one they picked: the automatic dark
    // is for a light accent's fill and would vanish on the dark bars.
    if (settings.accentText) root.style.setProperty('--ui-text-accent', settings.accentText);
    else root.style.removeProperty('--ui-text-accent');

    root.style.fontSize = settings.textSize ? `${settings.textSize}%` : '';
    // ON and OFF both override the system's reduce-motion setting; null leaves it to the system.
    if (settings.motion) root.setAttribute('data-motion', settings.motion.toLowerCase());
    else root.removeAttribute('data-motion');
    toggle(root, 'data-compact-nav', settings.compactNav);

    if (settings.friendsDock === 'RIGHT') root.setAttribute('data-friends-dock', 'right');
    else root.removeAttribute('data-friends-dock');

    if (settings.homeFriends && settings.homeFriends !== 'RIGHT') {
        root.setAttribute('data-home-friends', settings.homeFriends.toLowerCase());
    } else {
        root.removeAttribute('data-home-friends');
    }
};

const readCache = () => {
    try {
        return {...APPEARANCE_DEFAULTS, ...JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}')};
    } catch {
        return APPEARANCE_DEFAULTS;
    }
};

const writeCache = (settings) => {
    try {
        const changed = Object.values(settings).some(value => value != null);
        if (changed) localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
        else localStorage.removeItem(CACHE_KEY);
    } catch {
        // Storage refused (a private window): the server still has it, it just shows a beat later.
    }
};

// A player's own look of the site: kept on their account, applied to every page. Signed out, the
// site is as it comes.
export const AppearanceProvider = ({isLoggedIn, children}) => {
    const [settings, setSettings] = useState(APPEARANCE_DEFAULTS);

    // ponytail: the server renders the site as it comes and this repaints it on the first
    // client frame, so a changed look can flash its defaults on a hard reload. Moving it into a
    // blocking script in a custom _document would close that gap.
    // Signed out, the cache is somebody else's: it is not even read.
    useClientLayoutEffect(() => {
        if (isLoggedIn) setSettings(readCache());
    }, []);

    useEffect(() => {
        if (!isLoggedIn) {
            setSettings(APPEARANCE_DEFAULTS);
            return;
        }
        getAppearance().then(stored => stored && setSettings({...APPEARANCE_DEFAULTS, ...stored}));
    }, [isLoggedIn]);

    useClientLayoutEffect(() => {
        apply(settings);
        writeCache(isLoggedIn ? settings : APPEARANCE_DEFAULTS);
    }, [settings, isLoggedIn]);

    // Shown at once, not stored: for a colour being dragged about in the picker.
    const preview = (patch) => setSettings(current => ({...current, ...patch}));

    // Shown at once and stored; a failed save puts things back how they were.
    const update = (patch) => {
        const before = settings;
        const next = {...settings, ...patch};
        setSettings(next);
        return saveAppearance(next).then(stored => setSettings(stored ? {...APPEARANCE_DEFAULTS, ...stored} : before));
    };

    return (
        <AppearanceContext.Provider value={{settings, preview, update}}>
            {children}
        </AppearanceContext.Provider>
    );
};
