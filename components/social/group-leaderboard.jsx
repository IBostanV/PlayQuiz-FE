import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCrown, faDoorOpen, faRankingStar} from '@fortawesome/free-solid-svg-icons';
import {getGroupLeaderboard} from '../../api/social';
import {createRoom} from '../../api/live';
import {Popup} from '../common/popup';
import {Avatar} from '../common/avatar';

// A chat group's table, from the chat header: who answered the most right this week or month.
// And the quickest way to play together from there, a live room with the whole group invited.
export const GroupLeaderboard = ({groupId}) => {
    const {t} = useTranslation();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [period, setPeriod] = useState('WEEK');
    const [rows, setRows] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setRows(null);
        getGroupLeaderboard(groupId, period).then(result => setRows(Array.isArray(result) ? result : []));
    }, [open, period, groupId]);

    const playLive = () => {
        setBusy(true);
        createRoom({mode: 'ROOM', groupId})
            .then(room => room?.code && router.push(`/live/${room.code}`))
            .finally(() => setBusy(false));
    };

    return (
        <>
            <button type='button' className='friends-action' onClick={() => setOpen(true)} aria-haspopup='dialog'
                    aria-label={t('group_leaderboard', 'Group leaderboard')}
                    data-tooltip={t('group_leaderboard', 'Group leaderboard')}>
                <FontAwesomeIcon icon={faRankingStar}/>
            </button>

            <Popup open={open} icon={faRankingStar} title={t('group_leaderboard', 'Group leaderboard')} busy={busy}
                   onClose={() => setOpen(false)}>
                <div className='stats-periods group-board-periods' role='tablist'>
                    {[['WEEK', t('this_week', 'This week')], ['MONTH', t('this_month', 'This month')]].map(([value, label]) => (
                        <button key={value} type='button' role='tab' className='stats-period'
                                aria-selected={period === value} onClick={() => setPeriod(value)}>
                            {label}
                        </button>
                    ))}
                </div>

                {rows === null ? (
                    <div className='quiz-loading' aria-label={t('loading', 'Loading')}/>
                ) : (
                    <ol className='group-board'>
                        {rows.map(row => (
                            <li key={row.user?.id} className='group-board-row' data-podium={row.rightAnswers > 0 && row.rank <= 3 ? row.rank : undefined}>
                                <span className='group-board-rank'>
                                    {row.rank === 1 && row.rightAnswers > 0 ? <FontAwesomeIcon icon={faCrown}/> : row.rank}
                                </span>
                                <Avatar name={row.user?.displayName ?? '?'} photo={row.user?.photo} className='group-board-avatar'/>
                                <span className='group-board-name'>{row.user?.displayName}</span>
                                <span className='group-board-meta'>
                                    {t('group_board_meta', '{{quizzes}} quizzes · {{accuracy}}%',
                                        {quizzes: row.quizzes, accuracy: row.accuracy})}
                                </span>
                                <span className='group-board-score'>{row.rightAnswers}</span>
                            </li>
                        ))}
                    </ol>
                )}
                <p className='popup-message group-board-note'>
                    {t('group_board_note', 'Ranked by right answers. Custom quizzes do not count.')}
                </p>

                <div className='popup-actions'>
                    <button type='button' className='popup-cancel' onClick={() => setOpen(false)}>{t('close', 'Close')}</button>
                    <button type='button' className='popup-confirm' onClick={playLive} disabled={busy}>
                        <FontAwesomeIcon icon={faDoorOpen}/> {t('group_play_live', 'Play live together')}
                    </button>
                </div>
            </Popup>
        </>
    );
};

GroupLeaderboard.propTypes = {
    groupId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
};
