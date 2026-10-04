import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faGlobe} from '@fortawesome/free-solid-svg-icons';
import getLanguages from '../../api/question/get-languages';
import saveUserLanguage from '../../api/profile/save-language';

// The site's language. Kept in the browser for everyone (read on the next load), and on the
// account for a signed-in player, so the server writes its messages in it too. `onChange` hears
// the language picked, for a page holding the account's language in a form of its own.
// `id` lets a page's own label name the select. `field` draws it as a full form field with each
// language's own name ("Deutsch (DE)") rather than the compact code-only pill.
export const LanguageSelect = ({isLoggedIn, className = '', onChange, id, field = false}) => {
    const {t, i18n} = useTranslation();
    const [languages, setLanguages] = useState([]);
    const [language, setLanguage] = useState('');

    useEffect(() => {
        getLanguages().then(list => setLanguages(Array.isArray(list) ? list : []));
        setLanguage(localStorage.getItem('langId') ?? '');
    }, [isLoggedIn]);

    // A page can show two of these (its own and the footer's): each follows a change made in the other.
    useEffect(() => {
        const follow = () => setLanguage(localStorage.getItem('langId') ?? '');
        i18n.on('languageChanged', follow);
        return () => i18n.off('languageChanged', follow);
    }, [i18n]);

    const change = (event) => {
        const picked = languages.find(item => item.langId.toString() === event.target.value);
        if (!picked) return;
        setLanguage(String(picked.langId));
        if (isLoggedIn) saveUserLanguage(picked);
        onChange?.(picked);

        localStorage.setItem('langCode', picked.langCode);
        localStorage.setItem('langId', picked.langId);
        i18n.changeLanguage(picked.langCode).then(tFnc => toast.success(tFnc('saved')));
    };

    // As a field, the page's own label names the select, so the wrapper is a plain box; on its own,
    // the wrapper is the label.
    const Wrapper = field ? 'div' : 'label';

    return (
        <Wrapper className={`${field ? 'language-field' : 'language-select'} ${className}`.trim()}>
            <FontAwesomeIcon icon={faGlobe} className='language-icon'/>
            {!field && <span className='visually-hidden'>{t('language', 'Language')}</span>}
            <select id={id} className={field ? undefined : 'lang-select'} value={language} onChange={change}>
                {languages.map(lang => (
                    <option key={lang.langId} value={lang.langId}>
                        {field && lang.name ? `${lang.name} (${lang.langCode})` : lang.langCode}
                    </option>
                ))}
            </select>
        </Wrapper>
    );
};

LanguageSelect.propTypes = {
    isLoggedIn: PropTypes.bool,
    className: PropTypes.string,
    onChange: PropTypes.func,
    id: PropTypes.string,
    field: PropTypes.bool,
};
