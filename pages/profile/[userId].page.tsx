import React, {useEffect, useState} from 'react';
import {useRouter} from 'next/router';
import {hasCookie} from 'cookies-next';
import {useTranslation} from 'react-i18next';
import {getCurrentUser, getUserProfile} from '../../api/user';
import base64Util from '../../utils/base64Util';
import {TrophyBadge} from '../../components/trophy/trophy-badge';
import {Statistics} from '../../components/profile/statistics';

// A list the player picked (occupations, favourite categories), or a dash when they picked none.
const Chips = ({items}) => items?.length
    ? <ul className='profile-chips'>{items.map(item => <li key={item}>{item}</li>)}</ul>
    : <p className='profile-value' data-empty='true'>—</p>;

const Field = ({label, wide = false, children}) => (
    <div className='profile-field' data-wide={wide}>
        <span className='profile-field-label'>{label}</span>
        {children}
    </div>
);

// Another player's profile: the same card and details as the Profile page, read-only, without
// the email, the password change or the quiz history. Statistics are totals only, no runs. Opening your own sends you to /profile.
function UserProfile() {
    const {t} = useTranslation();
    const router = useRouter();
    const {userId} = router.query;
    const [profile, setProfile] = useState(null);
    const [missing, setMissing] = useState(false);

    useEffect(() => {
        if (!router.isReady) return;
        getCurrentUser().then(me => {
            if (String(me?.id) === String(userId)) {
                router.replace('/profile');
                return;
            }
            getUserProfile(userId as string).then(found => found ? setProfile(found) : setMissing(true));
        });
    }, [router.isReady, userId]);

    if (missing) {
        return <p className='profile-missing'>{t('profile_not_found', 'There is no such player.')}</p>;
    }
    if (!profile) {
        return <div className='profile-page'/>;
    }

    const fullName = [profile.name, profile.surname].filter(Boolean).join(' ');
    const {iq} = profile;

    return (
        <div className='profile-page'>
            <aside className='profile-card'>
                <div className='profile-avatar-slot'>
                    <div className='profile-avatar' data-readonly='true'>
                        {profile.avatar
                            ? <img src={base64Util(profile.avatar)} alt=''/>
                            : <span className='profile-avatar-initial' aria-hidden>{profile.displayName.charAt(0)}</span>}
                    </div>
                    {profile.trophy && (
                        <span className='profile-trophy' data-readonly='true' data-tooltip={profile.trophy.title}>
                            <TrophyBadge trophy={{...profile.trophy, earned: true, secret: false}} category={null}/>
                        </span>
                    )}
                </div>

                <h1 className='profile-name'>{fullName || profile.displayName}</h1>
                {fullName && profile.username && <p className='profile-username'>@{profile.username}</p>}
                <p className='profile-hint'>
                    {t('level_value', 'Level {{level}}', {level: profile.playerLevel?.level ?? 1})}
                </p>

                <div className='profile-iq'>
                    <h2 className='profile-section-title'>{t('iq_test', 'IQ test')}</h2>
                    {iq ? (
                        <>
                            <p className='profile-iq-score'>
                                <span className='profile-iq-number'>{iq.iq}</span>
                                <span className='profile-iq-range'>
                                    {t('iq_range_short', '{{low}}–{{high}}', {low: iq.low, high: iq.high})}
                                </span>
                            </p>
                            <p className='profile-hint'>
                                {t('iq_percentile_value', 'Above {{percentile}}% of takers', {percentile: iq.percentile})}
                                {!iq.normed && ` · ${t('iq_provisional_short', 'provisional scale')}`}
                            </p>
                        </>
                    ) : (
                        <p className='profile-hint'>{t('iq_not_taken', 'Not taken yet.')}</p>
                    )}
                </div>
            </aside>

            <section className='profile-form'>
                <h2 className='profile-section-title'>{t('user')}</h2>
                <div className='profile-grid'>
                    <Field label={t('username')}>
                        <p className='profile-value' data-empty={!profile.username}>{profile.username || '—'}</p>
                    </Field>
                    <Field label={t('name')}>
                        <p className='profile-value' data-empty={!profile.name}>{profile.name || '—'}</p>
                    </Field>
                    <Field label={t('surname')}>
                        <p className='profile-value' data-empty={!profile.surname}>{profile.surname || '—'}</p>
                    </Field>
                    <Field label={t('occupation')}>
                        <Chips items={profile.occupations}/>
                    </Field>
                    <Field label={t('favorite_categories')} wide>
                        <Chips items={profile.favoriteCategories}/>
                    </Field>
                </div>
            </section>

            <Statistics userId={profile.id}/>
        </div>
    );
}

export const getServerSideProps = async ({req, res}) => ({
    props: {
        isLoggedIn: hasCookie('authorization', {req, res}),
    },
});

export default UserProfile;
