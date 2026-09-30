import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';
import {hasCookie} from 'cookies-next';
import {Swiper, SwiperSlide} from 'swiper/react';
import {Autoplay, EffectCoverflow, Keyboard, Mousewheel, Navigation} from 'swiper/modules';
import Link from 'next/link';
import {categoryImageUrl, getAllCategoriesShort} from '../../api/category';
import {useTranslation} from "react-i18next";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {
    faChartSimple, faChevronLeft, faChevronRight, faGraduationCap, faLayerGroup, faPlay, faQuoteLeft
} from "@fortawesome/free-solid-svg-icons";
import {DidYouKnow} from "../../components/home/did-you-know";
import {MiniQuiz} from "../../components/home/mini-quiz";
import {DailyTasks} from "../../components/home/daily-tasks";
import {HomeNews} from "../../components/home/home-news";
import {HomeWelcome} from "../../components/home/home-welcome";
import {HomeConquest} from "../../components/home/home-conquest";
import {HomeNextTrophy} from "../../components/home/home-next-trophy";
import {HomeInvitations} from "../../components/home/home-invitations";
import {HomeRecent} from "../../components/home/home-recent";
import {HomeWeakSpot} from "../../components/home/home-weak-spot";
import {DailyChallenge} from "../../components/social/daily-challenge";
import {HomeLeaderboard} from "../../components/home/home-leaderboard";
import {getCurrentUser} from "../../api/user";
import {EXPERIENCE_CHANGED} from "../../api/quiz/save";

// What playing here looks like, start to finish; i18n keys with their defaults.
const STEPS = [
    {
        icon: faLayerGroup,
        title: ['step_choose_category', 'Choose a category'],
        text: ['step_choose_category_text', 'Pick a topic you like, or let an express quiz pick for you.'],
    },
    {
        icon: faPlay,
        title: ['step_take_quiz', 'Take the quiz'],
        text: ['step_take_quiz_text', 'Answer question by question, at your own pace.'],
    },
    {
        icon: faChartSimple,
        title: ['step_see_results', 'See your results'],
        text: ['step_see_results_text', 'Go through your answers and the right ones, side by side.'],
    },
    {
        icon: faGraduationCap,
        title: ['step_keep_learning', 'Keep learning'],
        text: ['step_keep_learning_text', 'Read up in the Wiki, then challenge your friends.'],
    },
];

// Swiper's loop needs at least twice the visible slides (7 on wide screens) to wrap around,
// so a short category list is repeated until it has enough.
const MIN_LOOP_SLIDES = 14;
// The carousel shows categories with a cover image only, at most this many.
const MAX_CATEGORIES = 9;
const toLoopSlides = (categories) => {
    if (!categories?.length) return [];
    const repeats = Math.ceil(MIN_LOOP_SLIDES / categories.length);
    return Array.from({length: repeats}, () => categories).flat();
};

// Quote of the day from zenquotes.io: the same one for everyone, a new one each day. Fetched
// server side (the API sends no CORS headers) and kept until the date rolls over, so the site
// makes one call a day. Only a successful fetch is cached, a failure falls back to our own quote.
let quoteOfTheDay = {date: '', quote: null};

const getDailyQuote = async () => {
    const date = new Date().toISOString().slice(0, 10);
    if (quoteOfTheDay.date === date) return quoteOfTheDay.quote;
    try {
        const [{q, a}] = await fetch('https://zenquotes.io/api/today').then(response => response.json());
        quoteOfTheDay = {date, quote: {text: q, author: a}};
    } catch {
        return null;
    }
    return quoteOfTheDay.quote;
};

function Home({isLoggedIn, quote}) {
    const {t} = useTranslation();
    // null until the categories are in and their pictures decoded: the carousel's space is kept
    // empty till then, and it fades in whole instead of landing half-drawn and pushing the page down.
    const [categories, setCategories] = useState(null);
    // The player, for the welcome panel. Re-read when experience changes (today's tasks pay on
    // this page), so its level bar keeps up with the navbar's.
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (!isLoggedIn) return undefined;
        const reload = () => getCurrentUser().then(setUser);
        reload();
        window.addEventListener(EXPERIENCE_CHANGED, reload);
        return () => window.removeEventListener(EXPERIENCE_CHANGED, reload);
    }, [isLoggedIn]);

    useEffect(() => {
        let current = true;
        // The short list has no pictures in it, only whether there is one: the pictures come
        // separately, all at once, and from the browser's cache on the next visit.
        getAllCategoriesShort().then(async all => {
            const shown = (Array.isArray(all) ? all : []).filter(category => category.hasImage).slice(0, MAX_CATEGORIES);
            // A picture that will not load is shown broken rather than holding the rest back.
            await Promise.all(shown.map(category => {
                const image = new Image();
                image.src = categoryImageUrl(category.catId);
                return image.decode().catch(() => undefined);
            }));
            if (current) setCategories(shown);
        });
        return () => {
            current = false;
        };
    }, []);

    const slides = toLoopSlides(categories ?? []);

    // The pitch for a first-time visitor, the explanation a returning player scrolls past:
    // rendered above the carousel while logged out, below it once signed in.
    // Full width of the window: it breaks out of main's padding.
    const howItWorks = (
        <section className='home-how' aria-labelledby='home-how-title' data-top={!isLoggedIn}>
            <div className='home-how-inner'>
                <div className='home-how-steps'>
                    <h2 id='home-how-title' className='home-section-title'>{t('how_it_works', 'How it works')}</h2>
                    <ol className='home-steps'>
                        {STEPS.map((step, index) => (
                            <li key={step.title[0]} className='home-step'>
                                <span className='home-step-badge' aria-hidden>
                                    <FontAwesomeIcon icon={step.icon}/>
                                    <span className='home-step-number'>{index + 1}</span>
                                </span>
                                <span className='home-step-body'>
                                    <span className='home-step-title'>{t(...step.title)}</span>
                                    <span className='home-step-text'>{t(...step.text)}</span>
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>

                <figure className='home-quote'>
                    <FontAwesomeIcon className='home-quote-mark' icon={faQuoteLeft} aria-hidden/>
                    <blockquote className='home-quote-text'>
                        {quote?.text || t('home_quote', 'A smarter you starts with a single question')}
                    </blockquote>
                    {quote?.author && <figcaption className='home-quote-author'>&mdash; {quote.author}</figcaption>}
                </figure>
            </div>
        </section>
    );

    return (
        <div>
            {isLoggedIn && <HomeWelcome user={user}/>}
            {/* Invitations waiting come straight after: somebody is waiting on this player. */}
            {isLoggedIn && <div className='home-row home-row-top'><HomeInvitations/></div>}
            {!isLoggedIn && howItWorks}
            <section className='home-categories'>
                <header className='home-section-header'>
                    <h2 className='home-section-title'>{t('popular_categories')}</h2>
                    <div className='home-carousel-nav'>
                        <button type='button' className='home-carousel-prev' aria-label={t('previous', 'Previous')}
                                data-tooltip={t('previous', 'Previous')}>
                            <FontAwesomeIcon icon={faChevronLeft}/>
                        </button>
                        <button type='button' className='home-carousel-next' aria-label={t('next', 'Next')}
                                data-tooltip={t('next', 'Next')}>
                            <FontAwesomeIcon icon={faChevronRight}/>
                        </button>
                    </div>
                </header>
                {/* The frame holds the carousel's height from the start (worked out from its width,
                    see .home-carousel-frame). The Swiper is mounted only once the categories and
                    their pictures are in: loop mode is set up at init, and an empty Swiper that
                    gets its slides later ends up not looping. */}
                <div className='home-carousel-frame' data-empty={categories?.length === 0 || undefined}>
                    {slides.length > 0 && <Swiper
                        className='home-carousel'
                        loop
                        // Centre card full size, each step away smaller: coverflow with no tilt and
                        // no shadows is a pure depth scale. Odd counts keep the sides symmetric.
                        effect='coverflow'
                        coverflowEffect={{rotate: 0, stretch: 0, depth: 160, modifier: 1, slideShadows: false}}
                        centeredSlides
                        slidesPerView={3}
                        spaceBetween={8}
                        breakpoints={{
                            768: {slidesPerView: 5},
                            1400: {slidesPerView: 7},
                        }}
                        autoplay={{
                            delay: 2500,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true
                        }}
                        navigation={{prevEl: '.home-carousel-prev', nextEl: '.home-carousel-next'}}
                        keyboard={{enabled: true}}
                        // Horizontal wheel / trackpad swipes only: with loop on there is no edge to
                        // release at, so a vertical wheel used to get stuck here instead of scrolling the page.
                        mousewheel={{forceToAxis: true}}
                        modules={[Mousewheel, Navigation, Keyboard, Autoplay, EffectCoverflow]}
                    >
                        {slides.map((category, index) => (
                            <SwiperSlide key={`${category.catId}-${index}`}>
                                <Link href={`/quiz/categorized/${category.catId}`} className='category-card'>
                                    <img className='category-card-image' src={categoryImageUrl(category.catId)} alt=''/>
                                    <span className='category-card-shade' aria-hidden/>
                                    <span className='category-card-body'>
                                        <span className='category-card-name'>{category.name}</span>
                                        <span className='category-card-play'>
                                            <FontAwesomeIcon icon={faPlay}/> {t('play', 'Play')}
                                        </span>
                                    </span>
                                </Link>
                            </SwiperSlide>
                        ))}
                    </Swiper>}
                </div>
            </section>
            {isLoggedIn && howItWorks}

            <div className='home-row'>
                <MiniQuiz/>
                {/* Goals are a player's own, and what they pay lands on their account. */}
                {/* Logged out there are no goals, so the fact takes their place. */}
                {isLoggedIn ? <DailyTasks/> : <DidYouKnow compact/>}
            </div>

            {/* The site's best, for everyone: a guest sees what there is to beat. */}
            <div className='home-row'>
                <HomeLeaderboard/>
            </div>

            {/* Today's race against everyone, and the spot worth practising. */}
            {isLoggedIn && <div className='home-row'>
                <DailyChallenge compact/>
                <HomeWeakSpot/>
            </div>}

            {/* What to play next, from what this player has already played. */}
            {isLoggedIn && <div className='home-row'>
                <HomeRecent/>
                <HomeNextTrophy/>
            </div>}

            {/* The map, for everyone: a guest sees who holds what before joining. */}
            <div className='home-row'>
                <HomeConquest userId={isLoggedIn ? user?.id : null}/>
            </div>

            {/* Signed in, the fact gets a row to itself, under the quiz and the goals. */}
            {isLoggedIn && <div className='home-row'>
                <DidYouKnow/>
            </div>}

            {/* Under the fact, whichever row that ended up in. */}
            <div className='home-row'>
                <HomeNews isLoggedIn={isLoggedIn}/>
            </div>

        </div>
    );
}

Home.propTypes = {
    isLoggedIn: PropTypes.bool,
    quote: PropTypes.shape({text: PropTypes.string, author: PropTypes.string}),
};

export const getServerSideProps = async ({req, res}) => ({
    props: {
        isLoggedIn: hasCookie('authorization', {req, res}),
        quote: await getDailyQuote(),
    },
});

export default Home;
