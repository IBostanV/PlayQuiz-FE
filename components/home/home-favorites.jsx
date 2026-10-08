import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faHeart, faPlay} from '@fortawesome/free-solid-svg-icons';
import {getOwnHistory} from '../../api/quiz';
import categoryImageUrl from '../../api/category/image-url';

// A 2 by 2 grid.
const SHOWN = 4;
// ponytail: "most played" is counted over the last runs only, not the whole history; a count
// per category from the server would do it exactly if that ever matters.
const RECENT_RUNS = 100;

// Home page: the player's own categories as a grid of their pictures. The favourites picked on
// the profile come first; whatever room is left goes to the categories they play most.
// `categories` is the site's category list (catId, name, hasImage), which has the pictures.
export const HomeFavorites = ({user, categories}) => {
    const {t} = useTranslation();
    // Category ids, the most played first.
    const [played, setPlayed] = useState([]);

    useEffect(() => {
        getOwnHistory(0, RECENT_RUNS).then(page => {
            const counts = new Map();
            (page?.content ?? [])
                .filter(run => run.categoryId && !run.custom)
                .forEach(run => counts.set(run.categoryId, (counts.get(run.categoryId) ?? 0) + 1));
            setPlayed([...counts].sort((a, b) => b[1] - a[1]).map(([id]) => id));
        });
    }, []);

    const byId = new Map((categories ?? []).map(category => [category.catId, category]));
    const ids = new Set([...(user?.favoriteCategories ?? []).map(category => category.catId), ...played]);
    const shown = [...ids].map(id => byId.get(id)).filter(Boolean).slice(0, SHOWN);

    if (!shown.length) return null;

    return (
        <section className='home-card' data-wide='true' aria-labelledby='home-favorites-title'>
            <header className='home-card-header'>
                <span className='home-card-icon' aria-hidden><FontAwesomeIcon icon={faHeart}/></span>
                <h2 id='home-favorites-title' className='home-card-title'>
                    {t('home_favorites', 'Favorite Categories')}
                </h2>
            </header>
            <ul className='home-favorites-grid'>
                {shown.map(category => (
                    <li key={category.catId}>
                        <Link href={`/quiz/categorized/${category.catId}`} className='category-card'>
                            {category.hasImage &&
                                <img className='category-card-image' src={categoryImageUrl(category.catId)} alt=''/>}
                            <span className='category-card-shade' aria-hidden/>
                            <span className='category-card-body'>
                                <span className='category-card-name'>{category.name}</span>
                                <span className='category-card-play'>
                                    <FontAwesomeIcon icon={faPlay}/> {t('play', 'Play')}
                                </span>
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
};

HomeFavorites.propTypes = {
    user: PropTypes.shape({favoriteCategories: PropTypes.arrayOf(PropTypes.shape({catId: PropTypes.number}))}),
    categories: PropTypes.arrayOf(PropTypes.shape({catId: PropTypes.number, name: PropTypes.string, hasImage: PropTypes.bool})),
};
