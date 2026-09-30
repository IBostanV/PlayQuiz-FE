import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBan, faTrophy} from '@fortawesome/free-solid-svg-icons';
import {getTrophies, preferTrophy} from '../../api/trophy';
import {getAllCategoriesShort} from '../../api/category';
import {Popup} from '../common/popup';
import {TrophyBadge} from '../trophy/trophy-badge';

// The trophy a player has chosen to show, pinned to the corner of their avatar, and the picker
// behind it. Only earned trophies are offered — the server refuses the rest anyway, so there is
// no point showing them here.
export const PreferredTrophy = () => {
    const {t} = useTranslation();
    const [trophies, setTrophies] = useState([]);
    const [categories, setCategories] = useState([]);
    const [picking, setPicking] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getTrophies().then(shelf => setTrophies(Array.isArray(shelf) ? shelf : []));
        getAllCategoriesShort().then(all => setCategories(Array.isArray(all) ? all : []));
    }, []);

    const categoryOf = (trophy) => trophy.categoryId
        && categories.find(category => category.catId === trophy.categoryId);

    const earned = trophies.filter(trophy => trophy.earned);
    const chosen = trophies.find(trophy => trophy.preferred);

    const choose = (code) => {
        setBusy(true);
        preferTrophy(code)
            .then(shelf => {
                if (!Array.isArray(shelf)) return;
                setTrophies(shelf);
                setPicking(false);
            })
            .finally(() => setBusy(false));
    };

    return (
        <>
            <button type='button'
                    className='profile-trophy'
                    data-empty={!chosen}
                    onClick={() => setPicking(true)}
                    aria-haspopup='dialog'
                    data-tooltip={chosen ? chosen.title : t('choose_trophy', 'Choose a trophy')}>
                {chosen
                    ? <TrophyBadge trophy={chosen} category={categoryOf(chosen)}/>
                    : <span className='trophy-face' data-empty='true'><FontAwesomeIcon icon={faTrophy}/></span>}
            </button>

            <Popup open={picking}
                   icon={faTrophy}
                   title={t('choose_trophy', 'Choose a trophy')}
                   onClose={() => setPicking(false)}>
                {earned.length ? (
                    <>
                        <ul className='trophy-picker'>
                            <li>
                                <button type='button'
                                        className='trophy-choice'
                                        data-chosen={!chosen}
                                        disabled={busy}
                                        onClick={() => choose('')}>
                                    <span className='trophy-face' data-empty='true'>
                                        <FontAwesomeIcon icon={faBan}/>
                                    </span>
                                    <span className='trophy-choice-name'>{t('trophy_none', 'None')}</span>
                                </button>
                            </li>
                            {earned.map(trophy => (
                                <li key={trophy.code}>
                                    <button type='button'
                                            className='trophy-choice'
                                            data-chosen={trophy.preferred}
                                            disabled={busy}
                                            onClick={() => choose(trophy.code)}>
                                        <TrophyBadge trophy={trophy} category={categoryOf(trophy)}/>
                                        <span className='trophy-choice-name'>{trophy.title}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <Link href='/trophies' className='profile-secondary-button'>
                            {t('trophies_all', 'All trophies')}
                        </Link>
                    </>
                ) : (
                    <>
                        <p className='profile-hint'>
                            {t('trophies_none_yet', 'No trophies yet — finish a quiz and the first one is yours.')}
                        </p>
                        <Link href='/trophies' className='profile-secondary-button'>
                            {t('trophies_all', 'All trophies')}
                        </Link>
                    </>
                )}
            </Popup>
        </>
    );
};
