import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowRight, faLightbulb} from '@fortawesome/free-solid-svg-icons';
import {getDailyRecord} from '../../api/knowledge-base';
import {excerpt} from '../knowledge-base/helpers';
import base64Util from '../../utils/base64Util';

// Home page "Did you know?": the knowledge base record of the day, picked by the server so it
// is the same for everyone and changes daily. Renders nothing until there is one.
export const DidYouKnow = ({compact = false}) => {
    const {t, i18n} = useTranslation();
    const [record, setRecord] = useState(null);

    useEffect(() => {
        getDailyRecord().then(result => setRecord(result?.id ? result : null));
    }, []);

    if (!record) return null;

    const today = new Date().toLocaleDateString(i18n.language, {weekday: 'long', day: 'numeric', month: 'long'});

    return (
        <section className='did-you-know' data-compact={compact} aria-labelledby='did-you-know-title'>
            <header className='did-you-know-header'>
                <span className='did-you-know-icon' aria-hidden><FontAwesomeIcon icon={faLightbulb}/></span>
                <div>
                    <h2 id='did-you-know-title' className='did-you-know-title'>{t('did_you_know', 'Did you know?')}</h2>
                    <span className='did-you-know-date'>{t('fact_of_the_day', 'Fact of the day')} · {today}</span>
                </div>
            </header>

            <div className='did-you-know-body'>
                {record.attachment && <img className='did-you-know-image' src={base64Util(record.attachment)} alt=''/>}
                <div>
                    <h3 className='did-you-know-record'>{record.title}</h3>
                    <p className='did-you-know-text'>{excerpt(record.content, 260)}</p>
                </div>
            </div>

            <Link href={`/knowledge-base/${record.id}`} className='did-you-know-more'>
                {t('read_more', 'Read more')}
                <span className='did-you-know-more-arrow' aria-hidden><FontAwesomeIcon icon={faArrowRight}/></span>
            </Link>
        </section>
    );
};
