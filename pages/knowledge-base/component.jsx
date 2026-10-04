import React, {useEffect, useMemo, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBookOpen, faMagnifyingGlass, faThumbsUp, faXmark} from '@fortawesome/free-solid-svg-icons';
import {getPublishedRecords} from '../../api/knowledge-base';
import base64Util from '../../utils/base64Util';
import {excerpt, splitTags} from '../../components/knowledge-base/helpers';

const SEARCH_DELAY = 300;
const SKELETON_CARDS = 6;

// Search runs on the server (title, content, tags); the category chips then narrow the results
// here, built from what the search returned, so a chip is never empty.
// ?q= and ?category= mirror the state, so a search can be linked to or reloaded.
const KnowledgeBase = () => {
    const {t} = useTranslation();
    const router = useRouter();

    const [input, setInput] = useState('');
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    // Until the URL has been read, fetching or rewriting the URL would act on empty state
    // and wipe a linked ?q= before it was ever applied.
    const [initialized, setInitialized] = useState(false);

    // Start from the URL once it is known.
    useEffect(() => {
        if (!router.isReady) return;
        const initial = String(router.query.q ?? '');
        setInput(initial);
        setQuery(initial);
        setCategoryId(router.query.category ? String(router.query.category) : null);
        setInitialized(true);
    }, [router.isReady]);

    // Typing settles before a request goes out.
    useEffect(() => {
        const timer = setTimeout(() => setQuery(input.trim()), SEARCH_DELAY);
        return () => clearTimeout(timer);
    }, [input]);

    // `current` drops a slow response that a newer search has already overtaken.
    useEffect(() => {
        if (!initialized) return;
        let current = true;
        setLoading(true);
        getPublishedRecords(query || undefined)
            .then(result => current && setRecords(result ?? []))
            .finally(() => current && setLoading(false));
        return () => {
            current = false;
        };
    }, [query, initialized]);

    useEffect(() => {
        if (!initialized) return;
        const next = {...(query && {q: query}), ...(categoryId && {category: categoryId})};
        router.replace({pathname: router.pathname, query: next}, undefined, {shallow: true, scroll: false});
    }, [query, categoryId, initialized]);

    const categories = useMemo(() => {
        const counts = new Map();
        records.forEach(record => {
            const id = String(record.categoryId);
            const entry = counts.get(id) ?? {id, name: record.categoryName, count: 0};
            entry.count += 1;
            counts.set(id, entry);
        });
        return Array.from(counts.values()).sort((a, b) => b.count - a.count);
    }, [records]);

    const visible = categoryId ? records.filter(record => String(record.categoryId) === categoryId) : records;

    const clearSearch = () => {
        setInput('');
        setQuery('');
        setCategoryId(null);
    };

    return (
        <div className='kb-page'>
            <header className='kb-hero'>
                <div className='kb-hero-icon' aria-hidden><FontAwesomeIcon icon={faBookOpen}/></div>
                <div className='quiz-hero-text'>
                    <h1 className='kb-title'>{t('knowledge_base')}</h1>
                    <p className='kb-subtitle'>
                        {t('kb_subtitle', 'Guides, explanations and tips to sharpen your quiz game.')}
                    </p>
                </div>

                <label className='kb-search'>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className='kb-search-icon'/>
                    <input type='search'
                           value={input}
                           onChange={(event) => setInput(event.target.value)}
                           placeholder={t('kb_search_placeholder', 'Search articles, topics or tags…')}
                           aria-label={t('search', 'Search')}/>
                    {input && (
                        <button type='button' className='kb-search-clear' onClick={() => setInput('')}
                                aria-label={t('clear_search', 'Clear search')} data-tooltip={t('clear_search', 'Clear search')}>
                            <FontAwesomeIcon icon={faXmark}/>
                        </button>
                    )}
                </label>
            </header>

            {categories.length > 1 && (
                <nav className='kb-chips' aria-label={t('categories', 'Categories')}>
                    <button type='button' className='kb-chip' aria-pressed={!categoryId} onClick={() => setCategoryId(null)}>
                        {t('all', 'All')} <span className='kb-chip-count'>{records.length}</span>
                    </button>
                    {categories.map(category => (
                        <button key={category.id} type='button' className='kb-chip'
                                aria-pressed={categoryId === category.id}
                                onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}>
                            {category.name} <span className='kb-chip-count'>{category.count}</span>
                        </button>
                    ))}
                </nav>
            )}

            {loading ? (
                <div className='kb-grid' aria-busy='true'>
                    {Array.from({length: SKELETON_CARDS}, (_, index) => <div key={index} className='kb-card kb-skeleton'/>)}
                </div>
            ) : visible.length ? (
                <div className='kb-grid'>
                    {visible.map(record => <ArticleCard key={record.id} record={record}/>)}
                </div>
            ) : (
                <div className='kb-empty'>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className='kb-empty-icon'/>
                    {query || categoryId ? (
                        <>
                            <p>{t('kb_no_results', 'No articles match “{{query}}”.', {query: query || categories.find(c => c.id === categoryId)?.name || ''})}</p>
                            <button type='button' className='kb-empty-action' onClick={clearSearch}>
                                {t('clear_search', 'Clear search')}
                            </button>
                        </>
                    ) : (
                        <p>{t('kb_empty', 'No articles yet. Check back soon.')}</p>
                    )}
                </div>
            )}
        </div>
    );
};

// Whole card is the link. Tags are plain text here (a link inside a link is invalid HTML);
// they become links on the article page.
export const ArticleCard = ({record}) => {
    const tags = splitTags(record.tags).slice(0, 3);

    return (
        <Link href={`/knowledge-base/${record.id}`} className='kb-card'>
            <span className='kb-card-media'>
                {record.attachment
                    ? <img src={base64Util(record.attachment)} alt=''/>
                    : <span className='kb-card-placeholder' aria-hidden><FontAwesomeIcon icon={faBookOpen}/></span>}
                {record.categoryName && <span className='kb-card-category'>{record.categoryName}</span>}
            </span>
            <span className='kb-card-body'>
                <span className='kb-card-title'>{record.title}</span>
                <span className='kb-card-excerpt'>{excerpt(record.content)}</span>
                <span className='kb-card-footer'>
                    <span className='kb-card-tags'>
                        {tags.map(tag => <span key={tag} className='kb-tag'>#{tag}</span>)}
                    </span>
                    {record.upvotes > 0 && (
                        <span className='kb-card-votes'><FontAwesomeIcon icon={faThumbsUp}/> {record.upvotes}</span>
                    )}
                </span>
            </span>
        </Link>
    );
};

export default KnowledgeBase;
