import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faBolt, faBrain, faCalendarDay, faCoins, faEarthAmericas, faHouse, faRankingStar, faRotateRight,
} from '@fortawesome/free-solid-svg-icons';
import {getUserHistoryQuiz} from '../../../api/quiz';
import {getBestArticles} from '../../../api/knowledge-base';
import {AnswerList, isRight} from '../../../components/quiz/answer-list';
import {getChallenges, getDailyChallenge} from '../../../api/social';
import {ChallengeFriends} from '../../../components/social/challenge-friends';
import {Versus} from '../../../components/social/versus';
import {ShareDaily} from '../../../components/social/share-daily';

// A new quiz of the same kind, started straight away: the same custom quiz, another express quiz,
// or the same category with the settings it was played with. The quiz pages say which in the
// address. A result opened from elsewhere (the history), a challenge or the daily challenge (both
// a stored quiz, played once) has no settings to go on, so it goes back to the picker.
const againHref = (quiz, {express, category, quizType, complexity, length}) => {
    if (quiz?.custom) return `/quiz/custom/${quiz.quizId}`;
    if (express) return '/quiz/express';
    if (!category) return '/quiz/categorized';
    return {
        pathname: `/quiz/categorized/${category}`,
        query: Object.fromEntries(Object.entries({quizType: quizType ?? '0', complexity, length}).filter(([, value]) => value)),
    };
};

// The score ring's circumference (r = 52), so the arc can be drawn as a fraction of it.
const RING = 2 * Math.PI * 52;

// How a finished quiz reads back: the score first, then every question with what was answered and,
// where it was wrong, what it should have been.
function QuizResult() {
    const router = useRouter();
    const {t} = useTranslation();
    const {historyId, conquest, challenge, daily, duel, review} = router.query;
    const [history, setHistory] = useState(null);
    // Played as a challenge: the challenge, for the head-to-head. Played as the daily challenge:
    // the day's table, for this player's place in it.
    const [versus, setVersus] = useState(null);
    const [day, setDay] = useState(null);
    // The best article for each category a wrong answer was in: "learn why".
    const [articles, setArticles] = useState({});

    // router.query is empty until the route resolves; isReady flips once.
    useEffect(() => {
        if (!router.isReady) return;
        getUserHistoryQuiz(historyId).then(result => {
            setHistory(result ?? null);
            const wrongIn = [...new Set((result?.answers ?? [])
                .filter(answer => !isRight(answer) && answer.categoryId)
                .map(answer => answer.categoryId))];
            getBestArticles(wrongIn).then(found => setArticles(found && typeof found === 'object' ? found : {}));
        });
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
                        {/* Absent for a custom quiz, which never pays; 0 for a replay, which already did. */}
                        {history.coinsEarned != null && (
                            <div className={'result-stat'} data-kind={'coins'}>
                                <dt>{t('coins_earned', 'Coins')}</dt>
                                <dd><FontAwesomeIcon icon={faCoins}/> +{history.coinsEarned}</dd>
                            </div>
                        )}
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
                        {day.streak > 1 && <> · 🔥 {t('daily_streak', '{{days}} days in a row', {days: day.streak})}</>}
                    </p>
                    {/* The squares, in the order asked: what makes a day's puzzle worth sending on. */}
                    <p className='result-daily-grid' aria-label={t('daily_grid', 'Right and wrong, question by question')}>
                        {answers.map((answer, index) => <span key={index}>{isRight(answer) ? '🟩' : '🟥'}</span>)}
                    </p>
                    <ShareDaily day={day} answers={answers}/>
                    <Link href='/challenges' className='did-you-know-more'>
                        {t('daily_table', 'See the table')}
                    </Link>
                </section>
            )}

            <AnswerList answers={answers} articles={articles}/>

            <div className={'result-actions'}>
                {/* A conquest run is one go per cooldown, so there is no "again": back to the map. */}
                {conquest ? (
                    <Link href={'/conquest'} className={'result-again'}>
                        <FontAwesomeIcon icon={faEarthAmericas}/>
                        <span>{t('back_to_map', 'Back to map')}</span>
                    </Link>
                ) : duel ? (
                    // A round is one turn: the next one is the other player's.
                    <Link href={'/challenges#duels'} className={'result-again'}>
                        <FontAwesomeIcon icon={faBolt}/>
                        <span>{t('back_to_duels', 'Back to duels')}</span>
                    </Link>
                ) : review ? (
                    <Link href={'/review'} className={'result-again'}>
                        <FontAwesomeIcon icon={faBrain}/>
                        <span>{t('review_more', 'Mistakes deck')}</span>
                    </Link>
                ) : (
                    <Link href={againHref(history.quiz, router.query)} className={'result-again'}>
                        <FontAwesomeIcon icon={faRotateRight}/>
                        <span>{t('play_again', 'Play again')}</span>
                    </Link>
                )}
                {/* Any quiz but a custom one (those have invitations) can be sent to friends to beat. */}
                {!history.quiz?.custom && !challenge && !duel && !review && <ChallengeFriends historyId={historyId}/>}
                <Link href={'/home'} className={'result-home'}>
                    <FontAwesomeIcon icon={faHouse}/>
                    <span>{t('home', 'Home')}</span>
                </Link>
            </div>
        </div>
    );
}

export default QuizResult;
