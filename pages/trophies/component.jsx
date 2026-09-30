import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faTrophy} from '@fortawesome/free-solid-svg-icons';
import {getTrophies, preferTrophy} from '../../api/trophy';
import {getAllCategoriesShort} from '../../api/category';
import {TrophyBadge} from '../../components/trophy/trophy-badge';

// The shelf. Earned trophies first within each group, then the locked ones with what they take,
// then the secret ones as blanks: they are meant to be come across, so the server sends nothing
// about one until it is won.
const GROUPS = [
    ['QUIZZES', 'trophies_quizzes', 'Quizzes'],
    ['CATEGORIES', 'trophies_categories', 'Categories'],
    ['CONQUEST', 'trophies_conquest', 'Conquest'],
    ['MIND', 'trophies_mind', 'Mind'],
    ['DEVOTION', 'trophies_devotion', 'Devotion'],
    ['SECRET', 'trophies_secret', 'Secret'],
];

function Trophies({isLoggedIn}) {
    const {t} = useTranslation();
    const [trophies, setTrophies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isLoggedIn) return;
        getTrophies().then(shelf => setTrophies(Array.isArray(shelf) ? shelf : []));
        // Category trophies wear their category's own picture. The short list only says which
        // categories have one; the badge loads it by URL, from the cache the home page filled.
        getAllCategoriesShort().then(all => setCategories(Array.isArray(all) ? all : []));
    }, [isLoggedIn]);

    const categoryOf = (trophy) => trophy.categoryId
        && categories.find(category => category.catId === trophy.categoryId);

    // Choosing the one shown beside your name; clicking the chosen one again clears it.
    const choose = (trophy) => {
        if (busy || !trophy.earned) return;
        setBusy(true);
        preferTrophy(trophy.preferred ? '' : trophy.code)
            .then(shelf => Array.isArray(shelf) && setTrophies(shelf))
            .finally(() => setBusy(false));
    };

    if (!isLoggedIn) {
        return (
            <section className='trophies-page'>
                <p className='trophies-lead'>{t('trophies_sign_in', 'Sign in to see your trophies.')}</p>
                <Link href='/login' className='profile-secondary-button'>{t('login', 'Login')}</Link>
            </section>
        );
    }

    const earned = trophies.filter(trophy => trophy.earned).length;

    return (
        <section className='trophies-page' aria-busy={busy}>
            <header className='trophies-header'>
                <span className='trophies-icon' aria-hidden><FontAwesomeIcon icon={faTrophy}/></span>
                <div>
                    <h1 className='trophies-title'>{t('trophies', 'Trophies')}</h1>
                    <p className='trophies-lead'>
                        {t('trophies_earned_of', '{{earned}} of {{total}} earned',
                            {earned, total: trophies.length})}
                        {' · '}
                        {t('trophies_pick_hint', 'Pick one to show beside your name')}
                    </p>
                </div>
            </header>

            {GROUPS.map(([group, key, fallback]) => {
                const rows = trophies.filter(trophy => trophy.group === group);
                if (!rows.length) return null;

                return (
                    <div key={group} className='trophies-group'>
                        <h2 className='trophies-group-title'>{t(key, fallback)}</h2>
                        <ul className='trophies-list'>
                            {rows.map(trophy => (
                                <li key={trophy.code}>
                                    <button type='button'
                                            className='trophy'
                                            data-earned={trophy.earned}
                                            data-preferred={trophy.preferred}
                                            disabled={busy || !trophy.earned}
                                            onClick={() => choose(trophy)}>
                                        <TrophyBadge trophy={trophy} category={categoryOf(trophy)}/>
                                        <span className='trophy-body'>
                                            <span className='trophy-name'>
                                                {trophy.title ?? t('trophy_secret', 'Secret trophy')}
                                            </span>
                                            <span className='trophy-what'>
                                                {trophy.description
                                                    ?? t('trophy_secret_hint', 'Found by playing, not by looking')}
                                            </span>
                                            {/* A bar only where there is something to count toward. */}
                                            {!trophy.earned && trophy.target > 1 && (
                                                <span className='trophy-bar'>
                                                    <span className='trophy-fill'
                                                          style={{width: `${Math.round(trophy.progress / trophy.target * 100)}%`}}/>
                                                    <span className='trophy-count'>
                                                        {trophy.progress}/{trophy.target}
                                                    </span>
                                                </span>
                                            )}
                                        </span>
                                        {trophy.preferred && (
                                            <span className='trophy-chosen'
                                                  title={t('trophy_chosen', 'Shown beside your name')}>
                                                <FontAwesomeIcon icon={faCheck}/>
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            })}
        </section>
    );
}

Trophies.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default Trophies;
