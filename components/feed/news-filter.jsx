import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSliders} from '@fortawesome/free-solid-svg-icons';
import {getHiddenNews, NEWS_KINDS, setHiddenNews} from '../../api/feed';

// What each kind of news is called in the filter.
const KIND_LABELS = {
    PATCH: ['news_kind_patch', 'Updates'],
    QUESTIONS_ADDED: ['news_kind_questions', 'New questions'],
    FRIEND_LEVELS: ['news_kind_friend_levels', "Friends' levels"],
    FRIEND_CONQUEST: ['news_kind_friend_conquests', "Friends' conquests"],
    FRIEND_POST: ['news_kind_friend_posts', "Friends' posts"],
    WORLD: ['news_kind_world', 'World news'],
};

// The kinds of news the signed-in player switched off. Kept on their account and applied by the
// server, so the home page and the News page show the same thing. `onSaved` runs after each change,
// for the caller to fetch the news again.
export const useNewsFilter = (isLoggedIn, onSaved) => {
    const [hidden, setHidden] = useState([]);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isLoggedIn) getHiddenNews().then(kinds => Array.isArray(kinds) && setHidden(kinds));
    }, [isLoggedIn]);

    const toggle = (kind) => {
        const next = hidden.includes(kind) ? hidden.filter(other => other !== kind) : [...hidden, kind];
        setSaving(true);
        setHiddenNews(next)
            .then(stored => {
                if (!Array.isArray(stored)) return undefined;
                setHidden(stored);
                return onSaved();
            })
            .finally(() => setSaving(false));
    };

    return {isLoggedIn, hidden, open, setOpen, saving, toggle};
};

const filterShape = PropTypes.shape({
    isLoggedIn: PropTypes.bool,
    hidden: PropTypes.arrayOf(PropTypes.string),
    open: PropTypes.bool,
    setOpen: PropTypes.func,
    saving: PropTypes.bool,
    toggle: PropTypes.func,
}).isRequired;

// The sliders button, with how many kinds are switched off on its rim. Only for a signed-in player:
// a guest has no account to keep the choice on.
export const NewsFilterButton = ({filter}) => {
    const {t} = useTranslation();
    if (!filter.isLoggedIn) return null;
    const label = t('news_filter', 'Choose what news to show');

    return (
        <button type='button' className='nav-user-action news-filter-button'
                onClick={() => filter.setOpen(open => !open)}
                aria-expanded={filter.open} aria-controls='news-kinds'
                aria-label={label} data-tooltip={label}>
            <FontAwesomeIcon icon={faSliders}/>
            {filter.hidden.length > 0 && <span className='nav-user-badge' aria-hidden>{filter.hidden.length}</span>}
        </button>
    );
};

NewsFilterButton.propTypes = {filter: filterShape};

// One checkbox per kind, ticked for the ones shown; changing one saves it straight away.
export const NewsKinds = ({filter}) => {
    const {t} = useTranslation();
    if (!filter.isLoggedIn || !filter.open) return null;

    return (
        <fieldset id='news-kinds' className='news-kinds' disabled={filter.saving}>
            <legend className='visually-hidden'>{t('news_filter', 'Choose what news to show')}</legend>
            {NEWS_KINDS.map(kind => (
                <label key={kind} className='news-kind'>
                    <input type='checkbox' checked={!filter.hidden.includes(kind)} onChange={() => filter.toggle(kind)}/>
                    {t(...KIND_LABELS[kind])}
                </label>
            ))}
        </fieldset>
    );
};

NewsKinds.propTypes = {filter: filterShape};
