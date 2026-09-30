import React, {useState} from 'react';
import PropTypes from 'prop-types';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowUp, faBolt, faBookOpen, faComments, faEnvelope, faHandHoldingHeart, faHouse, faPuzzlePiece, faUser,
} from '@fortawesome/free-solid-svg-icons';
import {FeedbackDialog} from '../feedback/feedback-dialog';

const LINKS = [
    {href: '/home', text: ['home', 'Home'], icon: faHouse},
    {href: '/quiz/categorized', text: ['take_quiz', 'Take quiz'], icon: faPuzzlePiece},
    {href: '/quiz/express', text: ['express_quiz', 'Express quiz'], icon: faBolt},
    {href: '/knowledge-base', text: ['knowledge_base', 'Wiki'], icon: faBookOpen},
    {href: '/chat', text: ['chat', 'Chat'], icon: faComments},
    {href: '/profile', text: ['profile', 'Profile'], icon: faUser},
    {href: '/donate', text: ['donate', 'Donate'], icon: faHandHoldingHeart, highlight: true},
];

// Site footer: brand and tagline, one row of links, a way to write to the admins (for everyone;
// guests may leave an address), back to top, and the data credits the map needs (the country list
// is ODbL, which asks for attribution).
export const Footer = ({isLoggedIn}) => {
    const {t} = useTranslation();
    const [writing, setWriting] = useState(false);
    const toTop = () => window.scrollTo({top: 0, behavior: 'smooth'});

    return (
        <footer className='site-footer'>
            <div className='site-footer-main'>
                <div className='site-footer-brand'>
                    <Link href='/home' aria-label='Play Quiz home'>
                        <img className='site-footer-logo' src='/resources/pq-white-logo.png' alt='Play Quiz'/>
                    </Link>
                    <p className='site-footer-tagline'>
                        {t('footer_tagline', 'Learn something new every day, test yourself and challenge your friends.')}
                    </p>
                </div>

                <nav className='site-footer-links' aria-label={t('footer_navigation', 'Footer')}>
                    <ul>
                        {LINKS.map(link => (
                            <li key={link.href}>
                                <Link href={link.href} className='site-footer-link' data-highlight={link.highlight}>
                                    <FontAwesomeIcon icon={link.icon} fixedWidth/> {t(...link.text)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <button type='button' className='site-footer-feedback' onClick={() => setWriting(true)}
                        aria-haspopup='dialog'>
                    <FontAwesomeIcon icon={faEnvelope}/>
                    <span>{t('send_feedback', 'Send feedback')}</span>
                </button>

                <button type='button' className='site-footer-top' onClick={toTop}
                        aria-label={t('back_to_top', 'Back to top')} data-tooltip={t('back_to_top', 'Back to top')}>
                    <FontAwesomeIcon icon={faArrowUp}/>
                </button>
            </div>

            <div className='site-footer-bottom'>
                <span>© {new Date().getFullYear()} Play Quiz</span>
                <span className='site-footer-credits'>
                    {t('footer_map_data', 'Map data')}: <a href='https://www.naturalearthdata.com' target='_blank' rel='noreferrer'>Natural Earth</a>
                    {' · '}
                    <a href='https://github.com/mledoze/countries' target='_blank' rel='noreferrer'>mledoze/countries</a> (ODbL)
                </span>
            </div>

            <FeedbackDialog open={writing} isLoggedIn={isLoggedIn} onClose={() => setWriting(false)}/>
        </footer>
    );
};

Footer.propTypes = {
    isLoggedIn: PropTypes.bool,
};
