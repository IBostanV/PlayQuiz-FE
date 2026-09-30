import React from 'react';
import PropTypes from 'prop-types';
import base64Util from '../../utils/base64Util';

// Up to two initials: "Ion Bostan" -> "IB", "vanyo93@yahoo.com" -> "VA".
export const initials = (name = '') => {
    const words = String(name).split('@')[0].split(/[\s._-]+/).filter(Boolean);
    const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2);
    return letters.toUpperCase();
};

// Same name, same hue, on every page and every visit.
export const hueFor = (name = '') => {
    let hash = 0;
    for (const char of String(name)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
    return Math.abs(hash) % 360;
};

// A picture where there is one (a player's photo, a group's), initials on a muted colour picked
// from the name where there is not. Same circle either way, so nothing shifts when one is set.
export const Avatar = ({name, photo, className = ''}) => photo
    ? <img className={`chat-avatar ${className}`.trim()} src={base64Util(photo)} alt=''/>
    : (
        <span className={`chat-avatar ${className}`.trim()}
              style={{'--avatar-hue': hueFor(name)}}
              aria-hidden>
            {initials(name)}
        </span>
    );

Avatar.propTypes = {
    name: PropTypes.string,
    photo: PropTypes.any,
    className: PropTypes.string,
};
