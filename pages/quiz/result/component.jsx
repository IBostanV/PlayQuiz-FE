import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCalendarDay, faEarthAmericas, faHouse, faRankingStar, faRotateRight} from '@fortawesome/free-solid-svg-icons';
import {getUserHistoryQuiz} from '../../../api/quiz';
import {AnswerList, isRight} from '../../../components/quiz/answer-list';
import {getChallenges, getDailyChallenge} from '../../../api/social';
import {ChallengeFriends} from '../../../components/social/challenge-friends';
import {Versus} from '../../../components/social/versus';

// The score ring's circumference (r = 52), so the arc can be drawn as a fraction of it.
const RING = 2 * Math.PI * 52;

// How a finished quiz reads back: the score first, then every question with what was answered and,
// where it was wrong, what it should have been.
function QuizResult() {
    const router = useRouter();
    const {t} = useTranslation();
    const {historyId, conquest, challenge, daily} = router.query;
    const [history, setHistory] = useState(null);
    // Played as a challenge: the challenge, for the head-to-head. Played as the daily challenge:
    // the day's table, for this player's place in it.
    const [versus, setVersus] = useState(null);
    const [day, setDay] = useState(null);

    // router.query is empty until the route resolves; isReady flips once.
    useEffect(() => {
        if (!router.isReady) return;
        getUserHistoryQuiz(historyId).then(result => setHistory(result ?? null));
        if (challenge) {
            getChallenges().then(all => setVersus(all?.received?.find(each => String(each.id) === String(challenge)) ?? null));
        }
        if (daily) getDailyChallenge().then(status => setDay(status ?? null));
    }, [router.isReady]);

    const answers = history?.answers ?? [];
    const total = answers.length;
    const right = answers.filter(isRight).length;
    const percent = total ? Math.round((right / total) * 100) : 0;

    const verdict = percent >= 80
        ? t('result_great', 'Brilliant run.')
        : percent >= 50
            ? t('result_good', 'Nicely done.')
            : t('result_keep_going', 'Keep at it: every question teaches one.');

    if (!history) {
        return (
            <div className={'result-page'}>
                <div className={'result-loading'} aria-label={t('loading', 'Loading')}/>
            </div>
        );
    }

    return (
        <div className={'result-page'}>
            <header className={'result-hero'}>
                {/* The ring fills with the share answered right. */}
                <div className={'result-score'} data-band={percent >= 80 ? 'high' : percent >= 50 ? 'mid' : 'low'}>
                    <svg viewBox={'0 0 120 120'} aria-hidden>
                        <circle className={'result-score-track'} cx={60} cy={60} r={52}/>
                        <circle className={'result-score-arc'} cx={60} cy={60} r={52}
                                strokeDasharray={RING}
                                strokeDashoffset={RING - (RING * percent) / 100}/>
                    </svg>
                    <span className={'result-score-value'}>
                        {percent}<span className={'result-score-unit'}>%</span>
                    </span>
                </div>

                <div className={'result-hero-text'}>
                    <h1 className={'result-title'}>{t('quiz_result', 'Quiz result')}</h1>
                    <p className={'result-verdict'}>{verdict}</p>

                    <dl className={'result-stats'}>
                        <div className={'result-stat'} data-kind={'right'}>
                            <dt>{t('right_answers', 'Right')}</dt>
                            <dd>{right}<span className={'result-stat-of'}>/{total}</span></dd>
                        </div>
                        <div className={'result-stat'} data-kind={'wrong'}>
                            <dt>{t('wrong_answers', 'Wrong')}</dt>
                            <dd>{total - right}</dd>
                        </div>
                        <div className={'result-stat'}>
                            <dt>{t('time_spent', 'Time')}</dt>
                            <dd>{history.spentTime ?? 0}<span className={'result-stat-of'}>s</span></dd>
                        </div>
                    </dl>
                </div>
            </header>

            {versus && (
                <section className='result-social'>
                    <h2 className='result-social-title'>
                        {t('challenge_from', 'Challenge from {{name}}', {name: versus.challenger?.displayName})}
                    </h2>
                    {/* The reader on the left: the outcome is flipped from the challenger's. */}
                    <Versus left={versus.opponent} right={versus.challenger}
                            leftScore={versus.opponentScore} rightScore={versus.challengerScore}
                            outcome={{WON: 'LOST', LOST: 'WON', DRAW: 'DRAW'}[versus.outcome] ?? null}/>
                </section>
            )}

            {day?.you && (
                <section className='result-social'>
                    <h2 className='result-social-title'>
                        <FontAwesomeIcon icon={faCalendarDay}/> {t('daily_challenge', 'Daily challenge')}
                    </h2>
                    <p className='result-daily-rank'>
                        <FontAwesomeIcon icon={faRankingStar}/>
                        {t('daily_rank', 'You are #{{rank}} of {{players}} today', {rank: day.you.rank, players: day.players})}
                    </p>
                    <Link href='/challenges' className='did-you-know-more'>
                        {t('daily_table', 'See the table')}
                    </Link>
                </section>
            )}

            <AnswerList answers={answers}/>

            <div className={'result-actions'}>
                {/* A conquest run is one go per cooldown, so there is no "again": back to the map. */}
                {conquest ? (
                    <Link href={'/conquest'} className={'result-again'}>
                        <FontAwesomeIcon icon={faEarthAmericas}/>
                        <span>{t('back_to_map', 'Back to map')}</span>
                    </Link>
                ) : (
                    <Link href={'/quiz/categorized'} className={'result-again'}>
                        <FontAwesomeIcon icon={faRotateRight}/>
                        <span>{t('play_again', 'Play again')}</span>
                    </Link>
                )}
                {/* Any quiz but a custom one (those have invitations) can be sent to friends to beat. */}
                {!history.quiz?.custom && !challenge && <ChallengeFriends historyId={historyId}/>}
                <Link href={'/home'} className={'result-home'}>
                    <FontAwesomeIcon icon={faHouse}/>
                    <span>{t('home', 'Home')}</span>
                </Link>
            </div>
        </div>
    );
}

export default QuizResult;
