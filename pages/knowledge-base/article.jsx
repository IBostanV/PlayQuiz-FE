import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowLeft, faChevronRight, faCircleCheck, faThumbsDown, faThumbsUp} from '@fortawesome/free-solid-svg-icons';
import {getArticle, voteArticle} from '../../api/knowledge-base';
import base64Util from '../../utils/base64Util';
import {splitTags} from '../../components/knowledge-base/helpers';
import {ArticleCard} from './component';

// One vote per article per browser: voting is anonymous, so the choice is remembered here.
const voteKey = (id) => `kb-vote-${id}`;
const readVote = (id) => {
    try {
        return localStorage.getItem(voteKey(id));
    } catch {
        return null;
    }
};

const Article = () => {
    const {t} = useTranslation();
    const router = useRouter();
    const {recordId} = router.query;

    const [article, setArticle] = useState(null);
    const [status, setStatus] = useState('loading');
    const [vote, setVote] = useState(null);
    const [voting, setVoting] = useState(false);

    useEffect(() => {
        if (!recordId) return;
        setStatus('loading');
        setVote(readVote(recordId));
        getArticle(recordId).then(result => {
            setArticle(result ?? null);
            setStatus(result ? 'ready' : 'missing');
        });
    }, [recordId]);

    const castVote = (helpful) => {
        setVoting(true);
        voteArticle(recordId, helpful)
            .then(updated => {
                if (!updated) return;
                const choice = helpful ? 'up' : 'down';
                try {
                    localStorage.setItem(voteKey(recordId), choice);
                } catch {
                    // Private mode etc.: the vote still counted, it just is not remembered.
                }
                setVote(choice);
                setArticle(current => ({...current, record: updated}));
            })
            .finally(() => setVoting(false));
    };

    if (status === 'loading') {
        return <div className='kb-article kb-article-loading' aria-busy='true'/>;
    }

    if (status === 'missing') {
        return (
            <div className='kb-page'>
                <div className='kb-empty'>
                    <p>{t('kb_not_found', 'This article does not exist or is no longer published.')}</p>
                    <Link href='/knowledge-base' className='kb-empty-action'>{t('kb_back', 'Back to the Wiki')}</Link>
                </div>
            </div>
        );
    }

    const {record, parent, children} = article;
    const tags = splitTags(record.tags);

    return (
        <div className='kb-page'>
            <nav className='kb-breadcrumbs' aria-label={t('breadcrumbs', 'Breadcrumbs')}>
                <Link href='/knowledge-base'><FontAwesomeIcon icon={faArrowLeft}/> {t('knowledge_base')}</Link>
                {parent && (
                    <>
                        <FontAwesomeIcon icon={faChevronRight} className='kb-breadcrumb-sep' aria-hidden/>
                        <Link href={`/knowledge-base/${parent.id}`}>{parent.title}</Link>
                    </>
                )}
            </nav>

            <article className='kb-article'>
                <header className='kb-article-header'>
                    {record.categoryName && (
                        <Link href={{pathname: '/knowledge-base', query: {category: record.categoryId}}} className='kb-article-category'>
                            {record.categoryName}
                        </Link>
                    )}
                    <h1 className='kb-article-title'>{record.title}</h1>
                    {tags.length > 0 && (
                        <div className='kb-article-tags'>
                            {tags.map(tag => (
                                <Link key={tag} href={{pathname: '/knowledge-base', query: {q: tag}}} className='kb-tag'
                                      data-tooltip={t('kb_tag_search', 'Articles tagged “{{tag}}”', {tag})}>
                                    #{tag}
                                </Link>
                            ))}
                        </div>
                    )}
                </header>

                {record.attachment && (
                    <img className='kb-article-image' src={base64Util(record.attachment)} alt=''/>
                )}

                {/* Sanitised on the server (jsoup, on save and on read), so it is safe to render. */}
                <div className='kb-content' dangerouslySetInnerHTML={{__html: record.content ?? ''}}/>

                <footer className='kb-feedback' aria-live='polite'>
                    {vote ? (
                        <p className='kb-feedback-thanks'>
                            <FontAwesomeIcon icon={faCircleCheck}/> {t('kb_thanks', 'Thanks for your feedback!')}
                        </p>
                    ) : (
                        <p className='kb-feedback-question'>{t('kb_helpful', 'Was this article helpful?')}</p>
                    )}
                    <div className='kb-feedback-actions'>
                        <button type='button' className='kb-vote' data-choice='up' aria-pressed={vote === 'up'}
                                disabled={Boolean(vote) || voting} onClick={() => castVote(true)}
                                data-tooltip={vote ? undefined : t('kb_vote_up', 'Yes, it helped')}>
                            <FontAwesomeIcon icon={faThumbsUp}/> {record.upvotes ?? 0}
                        </button>
                        <button type='button' className='kb-vote' data-choice='down' aria-pressed={vote === 'down'}
                                disabled={Boolean(vote) || voting} onClick={() => castVote(false)}
                                data-tooltip={vote ? undefined : t('kb_vote_down', 'No, it did not')}>
                            <FontAwesomeIcon icon={faThumbsDown}/> {record.downvotes ?? 0}
                        </button>
                    </div>
                </footer>
            </article>

            {children.length > 0 && (
                <section className='kb-related'>
                    <h2 className='kb-related-title'>{t('kb_in_this_topic', 'In this topic')}</h2>
                    <div className='kb-grid'>
                        {children.map(child => <ArticleCard key={child.id} record={child}/>)}
                    </div>
                </section>
            )}
        </div>
    );
};

export default Article;
