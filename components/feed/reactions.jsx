import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {getReactions, REACTIONS, toggleReaction} from '../../api/social';

// What friends did, and what group members post, is what people react to; a headline or a patch
// note is not theirs to cheer.
const REACTABLE = new Set(['FRIEND_LEVELS', 'FRIEND_CONQUEST', 'FRIEND_POST', 'GROUP_POST']);

export const isReactable = (item) => REACTABLE.has(item?.type);

// A list's reactions, read in one request for all its lines: { tallies: {key: [...]}, react }.
export const useReactions = (items, enabled = true) => {
    const [tallies, setTallies] = useState({});
    const keys = (items ?? []).filter(isReactable).map(item => item.key);
    const signature = keys.join(',');

    useEffect(() => {
        if (!enabled || !keys.length) return;
        getReactions(keys).then(result => result && setTallies(result));
    }, [signature, enabled]);

    // Shown at once, then corrected by what the server says the line now has.
    const react = (key, kind) => {
        setTallies(current => ({
            ...current,
            [key]: (current[key] ?? []).map(tally => tally.kind !== kind ? tally : {
                ...tally, mine: !tally.mine, count: tally.count + (tally.mine ? -1 : 1),
            }),
        }));
        toggleReaction(key, kind).then(line => line && setTallies(current => ({...current, [key]: line})));
    };

    return {tallies, react};
};

// The row of reactions under a friend's line: every kind as a small pill with its count, the
// reader's own lit.
export const Reactions = ({tallies, onReact}) => {
    const {t} = useTranslation();
    if (!tallies?.length) return null;

    return (
        <div className='reactions' role='group' aria-label={t('reactions', 'Reactions')}>
            {tallies.map(tally => (
                <button key={tally.kind} type='button' className='reaction'
                        aria-pressed={tally.mine} data-empty={tally.count === 0 || undefined}
                        onClick={() => onReact(tally.kind)}>
                    <span aria-hidden>{REACTIONS[tally.kind]}</span>
                    {tally.count > 0 && <span className='reaction-count'>{tally.count}</span>}
                </button>
            ))}
        </div>
    );
};

Reactions.propTypes = {
    tallies: PropTypes.array,
    onReact: PropTypes.func.isRequired,
};
