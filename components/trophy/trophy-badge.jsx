import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faAward, faBolt, faBrain, faCrown, faEarthAmericas, faFire, faFlag, faLayerGroup, faLock,
    faMedal, faMoon, faQuestion, faStar, faTrophy,
} from '@fortawesome/free-solid-svg-icons';
import {categoryImageUrl} from '../../api/category';

// The icon names the server sends, which are what a trophy is about rather than which picture to
// use — the drawing is this side's business.
const ICONS = {
    flag: faFlag, medal: faMedal, award: faAward, trophy: faTrophy, crown: faCrown,
    globe: faEarthAmericas, brain: faBrain, fire: faFire, star: faStar, moon: faMoon,
    bolt: faBolt, category: faLayerGroup,
};

// One trophy's face: its category's own artwork where it has one, its icon otherwise, and a
// padlock while it is locked. A secret trophy nobody has earned shows nothing at all.
export const TrophyBadge = ({trophy, category}) => {
    if (trophy.secret && !trophy.earned) {
        return <span className='trophy-face' data-secret='true'><FontAwesomeIcon icon={faQuestion}/></span>;
    }

    return (
        <span className='trophy-face' data-earned={trophy.earned}>
            {category?.hasImage
                ? <img className='trophy-image' src={categoryImageUrl(category.catId)} alt='' loading='lazy'/>
                : <FontAwesomeIcon icon={ICONS[trophy.icon] ?? faTrophy}/>}
            {!trophy.earned && <span className='trophy-lock' aria-hidden><FontAwesomeIcon icon={faLock}/></span>}
        </span>
    );
};
