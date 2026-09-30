import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Avatar} from '../common/avatar';

const seconds = (value) => (value == null ? '—' : `${Math.round(value)}s`);

// Two runs of the same quiz side by side, the better one lit: a challenge's two players. Either
// side may not have played yet, which reads as waiting rather than as nought.
export const Versus = ({left, right, leftScore, rightScore, outcome}) => {
    const {t} = useTranslation();
    // outcome is the left player's: WON, LOST, DRAW, or null while one side has not played.
    const side = (user, score, won) => (
        <div className='versus-side' data-won={won || undefined}>
            <Avatar name={user?.displayName ?? '?'} photo={user?.photo} className='versus-avatar'/>
            <span className='versus-name'>{user?.displayName}</span>
            {score ? (
                <>
                    <span className='versus-score'>{score.rightAnswers}<small>/{score.totalAnswers}</small></span>
                    <span className='versus-time'>{seconds(score.spentTime)}</span>
                </>
            ) : (
                <span className='versus-waiting'>{t('versus_waiting', 'Not played yet')}</span>
            )}
        </div>
    );

    return (
        <div className='versus' data-outcome={outcome ?? 'PENDING'}>
            {side(left, leftScore, outcome === 'WON')}
            <span className='versus-vs' aria-hidden>VS</span>
            {side(right, rightScore, outcome === 'LOST')}
        </div>
    );
};

Versus.propTypes = {
    left: PropTypes.object,
    right: PropTypes.object,
    leftScore: PropTypes.object,
    rightScore: PropTypes.object,
    outcome: PropTypes.string,
};
