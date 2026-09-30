import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBrain} from '@fortawesome/free-solid-svg-icons';
import {getLatestIqResult} from '../../api/iq';

// The IQ test result on the profile card: the score with the range it was measured to, because a
// score quoted on its own invites people to read three points as a difference. Nothing taken yet
// is a link to go and take it.
export const IqScore = () => {
    const {t, i18n} = useTranslation();
    const [result, setResult] = useState(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        getLatestIqResult()
            .then(found => setResult(found?.iq ? found : null))
            .finally(() => setLoaded(true));
    }, []);

    if (!loaded) return null;

    return (
        <div className='profile-iq'>
            <h2 className='profile-section-title'>{t('iq_test', 'IQ test')}</h2>

            {result ? (
                <>
                    <p className='profile-iq-score'>
                        <span className='profile-iq-number'>{result.iq}</span>
                        <span className='profile-iq-range'>
                            {t('iq_range_short', '{{low}}–{{high}}', {low: result.low, high: result.high})}
                        </span>
                    </p>
                    <p className='profile-hint'>
                        {t('iq_percentile_value', 'Above {{percentile}}% of takers', {percentile: result.percentile})}
                        {result.finishedDate && ` · ${new Date(result.finishedDate).toLocaleDateString(i18n.language)}`}
                        {!result.normed && ` · ${t('iq_provisional_short', 'provisional scale')}`}
                    </p>
                    <Link href='/iq' className='profile-secondary-button'>
                        <FontAwesomeIcon icon={faBrain}/>
                        {t('iq_retake', 'Take it again')}
                    </Link>
                </>
            ) : (
                <>
                    <p className='profile-hint'>
                        {t('iq_profile_empty', 'Twenty minutes of figures and patterns, scored on the usual scale.')}
                    </p>
                    <Link href='/iq' className='profile-secondary-button'>
                        <FontAwesomeIcon icon={faBrain}/>
                        {t('iq_begin', 'Begin the test')}
                    </Link>
                </>
            )}
        </div>
    );
};
