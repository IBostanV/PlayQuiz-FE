import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLock, faWandMagicSparkles} from '@fortawesome/free-solid-svg-icons';
import {getUserActivity} from '../../api/user';
import {REACTIONS} from '../../api/social';
import {Avatar} from '../common/avatar';
import {GroupCard} from '../group/group-card';
import {formatDate} from '../../utils/toDate';

const day = (value) => formatDate(value, undefined, {dateStyle: 'medium'});

const scoreOf = (run) => run.totalAnswers > 0 ? Math.round((run.rightAnswers / run.totalAnswers) * 100) : null;

const Empty = ({children}) => <p className='profile-hint'>{children}</p>;

// Another player's activity on their profile: quizzes with their scores, the posts they liked,
// what they wrote, their friends and their groups — one tab at a time. The player chooses who sees
// it; when the reader is not one of them, the block says so and shows nothing else.
export const ProfileActivity = ({userId, name}) => {
    const {t} = useTranslation();
    const [activity, setActivity] = useState(null);
    const [tab, setTab] = useState('quizzes');

    useEffect(() => {
        getUserActivity(userId).then(result => setActivity(result ?? null));
    }, [userId]);

    if (!activity) return null;

    if (!activity.visible) {
        return (
            <section className='profile-history profile-activity'>
                <h2 className='profile-section-title'>{t('activity', 'Activity')}</h2>
                <p className='profile-activity-locked'>
                    <FontAwesomeIcon icon={faLock}/>{' '}
                    {activity.visibility === 'FRIENDS'
                        ? t('activity_friends_only', '{{name}} shares their activity with friends only.', {name})
                        : t('activity_private', '{{name}} keeps their activity private.', {name})}
                </p>
            </section>
        );
    }

    const tabs = [
        {id: 'quizzes', label: t('activity_quizzes', 'Quizzes'), count: activity.history.length},
        {id: 'likes', label: t('activity_likes', 'Likes'), count: activity.likes.length},
        {id: 'writing', label: t('activity_writing', 'Posts & articles'), count: activity.posts.length + activity.articles.length},
        {id: 'friends', label: t('friends', 'Friends'), count: activity.friends.length},
        {id: 'groups', label: t('groups', 'Groups'), count: activity.groups.length},
    ];

    return (
        <section className='profile-history profile-activity'>
            <h2 className='profile-section-title'>{t('activity', 'Activity')}</h2>

            <div className='profile-activity-tabs' role='tablist' aria-label={t('activity', 'Activity')}>
                {tabs.map(each => (
                    <button key={each.id} type='button' role='tab' id={`activity-tab-${each.id}`}
                            className='profile-activity-tab' aria-selected={tab === each.id}
                            aria-controls='activity-panel' onClick={() => setTab(each.id)}>
                        {each.label}<span className='profile-activity-count'>{each.count}</span>
                    </button>
                ))}
            </div>

            <div id='activity-panel' role='tabpanel' aria-labelledby={`activity-tab-${tab}`}>
                {tab === 'quizzes' && (activity.history.length ? (
                    <ul className='profile-runs'>
                        {activity.history.map(run => {
                            const score = scoreOf(run);
                            return (
                                <li key={run.historyId} className='profile-run'>
                                    <div className='profile-run-head' data-static='true'>
                                        <span className='profile-run-title'>
                                            {run.category ?? t('express_quiz', 'Express quiz')}
                                            {run.custom && (
                                                <span className='profile-run-custom' title={t('custom_quiz', 'Custom quiz')}>
                                                    <FontAwesomeIcon icon={faWandMagicSparkles}/>
                                                </span>
                                            )}
                                            {run.quizType && <span className='profile-run-type'>{run.quizType}</span>}
                                        </span>
                                        <span className='profile-run-date'>{day(run.completedAt)}</span>
                                        <span className='profile-run-score'
                                              data-band={score == null ? 'none' : score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low'}>
                                            {score == null ? '—' : <>{run.rightAnswers}/{run.totalAnswers}
                                                <span className='profile-run-percent'>{score}%</span></>}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : <Empty>{t('activity_no_quizzes', 'No quizzes yet.')}</Empty>)}

                {tab === 'likes' && (activity.likes.length ? (
                    <ul className='profile-activity-list'>
                        {activity.likes.map(like => (
                            <li key={`${like.type}-${like.id}`} className='profile-activity-item'>
                                <span className='profile-activity-emoji' aria-hidden>{REACTIONS[like.kind]}</span>
                                <span className='profile-activity-body'>
                                    <span className='profile-activity-title'>
                                        {like.title ?? like.text}
                                    </span>
                                    <span className='profile-activity-meta'>
                                        {like.author && <Link href={`/profile/${like.author.id}`}>{like.author.displayName}</Link>}
                                        {like.groupId && <>{' · '}<Link href={`/groups/${like.groupId}`}>{like.groupName}</Link></>}
                                        {' · '}{day(like.at)}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : <Empty>{t('activity_no_likes', 'No liked posts you can see.')}</Empty>)}

                {tab === 'writing' && (
                    <>
                        <h3 className='profile-activity-subtitle'>{t('activity_posts', 'News posts')}</h3>
                        {activity.posts.length ? (
                            <ul className='profile-activity-list'>
                                {activity.posts.map(post => (
                                    <li key={post.id} className='profile-activity-item'>
                                        <span className='profile-activity-body'>
                                            <span className='profile-activity-title'>{post.title}</span>
                                            {post.text && <span className='profile-activity-text'>{post.text}</span>}
                                            <span className='profile-activity-meta'>{day(post.at)}</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : <Empty>{t('activity_no_posts', 'No posts yet.')}</Empty>}

                        <h3 className='profile-activity-subtitle'>{t('activity_articles', 'Knowledge base articles')}</h3>
                        {activity.articles.length ? (
                            <ul className='profile-activity-list'>
                                {activity.articles.map(article => (
                                    <li key={article.id} className='profile-activity-item'>
                                        <span className='profile-activity-body'>
                                            <Link href={`/knowledge-base/${article.id}`} className='profile-activity-title'>{article.title}</Link>
                                            <span className='profile-activity-meta'>
                                                {article.category && <>{article.category}{' · '}</>}{day(article.at)}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : <Empty>{t('activity_no_articles', 'No articles yet.')}</Empty>}
                    </>
                )}

                {tab === 'friends' && (activity.friends.length ? (
                    <ul className='group-members profile-activity-friends'>
                        {activity.friends.map(friend => (
                            <li key={friend.id} className='group-member'>
                                <Avatar name={friend.displayName} frame={friend.frame}/>
                                <Link href={`/profile/${friend.id}`} style={{color: friend.nameColor ?? undefined}}>{friend.displayName}</Link>
                            </li>
                        ))}
                    </ul>
                ) : <Empty>{t('activity_no_friends', 'No friends yet.')}</Empty>)}

                {tab === 'groups' && (activity.groups.length ? (
                    <div className='group-grid'>{activity.groups.map(group => <GroupCard key={group.id} group={group}/>)}</div>
                ) : <Empty>{t('activity_no_groups', 'Not in any group you can see.')}</Empty>)}
            </div>
        </section>
    );
};

ProfileActivity.propTypes = {
    userId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string,
};

Empty.propTypes = {
    children: PropTypes.node,
};
