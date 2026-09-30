import React from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';

// The two lists of a player's custom quizzes: the ones they were invited to and the ones they made.
// Shown on both, so either is one click from the other.
export const QuizTabs = () => {
    const {t} = useTranslation();
    const {pathname} = useRouter();

    const tabs = [
        {href: '/quiz/invitations', label: t('quiz_invitations', 'Quiz invitations')},
        {href: '/quiz/my-quizzes', label: t('my_quizzes', 'My quizzes')},
    ];

    return (
        <nav className={'quiz-tabs'} aria-label={t('my_quizzes_navigation', 'My quizzes and invitations')}>
            {tabs.map(tab => (
                <Link key={tab.href} href={tab.href} className={'quiz-tab'}
                      aria-current={pathname === tab.href ? 'page' : undefined}>
                    {tab.label}
                </Link>
            ))}
        </nav>
    );
};
