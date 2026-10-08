import React, {useEffect, useMemo, useState} from 'react';
import getCategories, {getCategoryIdsWithQuestions} from '../../../api/category/get-all';
import Link from 'next/link';
import {getQuizTypes} from "../../../api/quiz";
import {useTranslation} from "react-i18next";
import base64Util from "../../../utils/base64Util";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faChevronRight, faMagnifyingGlass, faPlay, faPuzzlePiece, faXmark} from "@fortawesome/free-solid-svg-icons";
import {Avatar} from "../../../components/common/avatar";

// Flat list -> tree. A parentId pointing at a category that is not in the list (hidden,
// deleted) leaves the child at the root, so nothing disappears from the page.
const toTree = (list) => {
    const nodes = new Map((list ?? []).map(category => [category.catId, {...category, children: []}]));
    const roots = [];
    nodes.forEach(node => (nodes.get(node.parentId)?.children ?? roots).push(node));
    return roots;
};

// Keeps categories whose name matches, plus the parents leading to them, so a match deep in
// the tree is still reachable. A matching parent keeps all its children.
export const filterTree = (nodes, query) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return nodes;
    return nodes.flatMap(node => {
        if (node.name?.toLowerCase().includes(needle)) return [node];
        const children = filterTree(node.children, query);
        return children.length ? [{...node, children}] : [];
    });
};

// Keeps the categories a quiz can be played in: those with questions of their own (`withQuestions`,
// a Set of ids) and the parents of any such, since a parent's quiz draws from its subcategories too.
// null (not known yet) keeps everything.
export const playableTree = (nodes, withQuestions) => {
    if (!withQuestions) return nodes;
    return nodes.flatMap(node => {
        const children = playableTree(node.children, withQuestions);
        return withQuestions.has(node.catId) || children.length ? [{...node, children}] : [];
    });
};

// Difficulty bands over Q_QUESTION.COMPLEXITY_LEVEL (1-10), sent as "from-to"; '' is any.
const DIFFICULTIES = [
    {value: '', label: ['any_difficulty', 'Any']},
    {value: '1-3', label: ['difficulty_easy', 'Easy']},
    {value: '4-7', label: ['difficulty_medium', 'Medium']},
    {value: '8-10', label: ['difficulty_hard', 'Hard']},
];

// How many questions to ask; '' leaves it to the system's default length.
const LENGTHS = [
    {value: '', label: ['default_length', 'Default']},
    {value: '5', label: ['length_5', '5']},
    {value: '10', label: ['length_10', '10']},
    {value: '20', label: ['length_20', '20']},
];

// A filter as one row: its name and what is picked, opening to its options. Native <details>, so
// it opens and closes without state, and only the filter being changed takes up room. The shared
// `name` makes them an exclusive accordion: opening one closes the others.
// `column`: one option per line, for names too long to share a row.
const Filter = ({name, label, options, value, column = false, onChange}) => (
    <details className={'quiz-filter'} name={'quiz-filter'}>
        <summary className={'quiz-filter-toggle'}>
            <span className={'quiz-filter-label'}>{label}</span>
            <span className={'quiz-filter-value'}>{options.find(option => option.value === value)?.label}</span>
        </summary>
        <div className={`quiz-type-options${column ? ' quiz-type-options-column' : ''}`}
             role={'group'} aria-label={label}>
            {options.map(option => (
                <label key={option.value || 'any'} className={'quiz-type-option'}>
                    <input type='radio' name={name} value={option.value}
                           checked={value === option.value}
                           onChange={() => onChange(option.value)}/>
                    <span>{option.label}</span>
                </label>
            ))}
        </div>
    </details>
);

// The category's own image, small, or its initials when it has none.
const Thumb = ({category}) => category.attachment
    ? <img className='quiz-tile-thumb' src={base64Util(category.attachment)} alt=''/>
    : <Avatar name={category.name} className='quiz-tile-thumb'/>;

function Quiz() {
    const {t} = useTranslation();

    const [categories, setCategories] = useState([]);
    const [types, setTypes] = useState([]);
    const [query, setQuery] = useState('');

    const [quizType, setQuizType] = useState('0');
    // Which categories have questions for the chosen type and difficulty, per "type|difficulty" as
    // each pair is first picked.
    const [withQuestions, setWithQuestions] = useState({});
    // A difficulty band as "from-to" over Q_QUESTION.COMPLEXITY_LEVEL (1-10); '' is any.
    const [complexity, setComplexity] = useState('');
    const [length, setLength] = useState('');
    // Category under the cursor; its artwork replaces the page backdrop.
    const [hovered, setHovered] = useState(null);
    const [backdrop, setBackdrop] = useState(null);
    // The last few backdrops, newest last, so the old one can fade out under the new one
    // instead of the picture swapping in a blink. null (nothing hovered) is a layer too.
    const [layers, setLayers] = useState([]);

    useEffect(() => {
        const fetchCategories = async () => await getCategories();
        fetchCategories().then(list => setCategories(toTree(list)));

        const fetchQuizTypes = async () => await getQuizTypes();
        fetchQuizTypes().then(setTypes);
    }, []);

    // Let the hover settle before swapping the artwork, so sweeping the cursor down the
    // list does not strobe through every category image.
    useEffect(() => {
        const timer = setTimeout(() => setBackdrop(hovered), 160);
        return () => clearTimeout(timer);
    }, [hovered]);

    useEffect(() => {
        setLayers(previous => [...previous.filter(item => item !== backdrop).slice(-2), backdrop]);
    }, [backdrop]);

    const filterKey = `${quizType}|${complexity}`;
    useEffect(() => {
        if (withQuestions[filterKey]) return;
        getCategoryIdsWithQuestions(quizType, complexity).then(ids => Array.isArray(ids)
            && setWithQuestions(known => ({...known, [filterKey]: new Set(ids)})));
    }, [filterKey]);

    const searching = Boolean(query.trim());
    // Until the type's list arrives (or if it fails), every category shows, as before.
    const visible = useMemo(() => filterTree(playableTree(categories, withQuestions[filterKey] ?? null), query),
        [categories, query, filterKey, withQuestions]);

    // Hovering a branch swaps the backdrop too, so parents behave like any other tile.
    const hoverProps = (item) => ({
        onMouseEnter: () => setHovered(item),
        onMouseLeave: () => setHovered(null),
        onFocus: () => setHovered(item),
        onBlur: () => setHovered(null),
    });

    const playHref = (item) => ({
        pathname: `/quiz/categorized/${item.catId}`,
        query: {
            quizType,
            ...(complexity ? {complexity} : {}),
            ...(length ? {length} : {}),
        }
    });

    const playPill = <span className='quiz-tile-play' aria-hidden><FontAwesomeIcon icon={faPlay}/> {t('play', 'Play')}</span>;

    // Branches expand on the left, play on the right; leaves are one plain tile.
    const renderNode = (item) => item.children.length
        ? (
            // Shared name = native exclusive accordion: opening one sibling closes the rest.
            // While searching every match is shown open, so the name (which would allow only
            // one open sibling) is dropped.
            <details key={item.catId}
                     name={searching ? undefined : `quiz-branch-${item.parentId ?? 'root'}`}
                     open={searching}
                     className={'quiz-branch'}>
                <summary className={'quiz-tile'} {...hoverProps(item)}>
                    {/* Two hit zones fill the row: left 30% toggles, right 70% plays this
                        category. An <a> inside a <summary> is the activation target, so it
                        navigates without toggling. The content paints over both zones and
                        ignores the pointer, so each half lights up on its own. */}
                    <span className={'quiz-branch-toggle'} data-tooltip={t('show_subcategories', 'Show subcategories')}/>
                    <Link href={playHref(item)} className={'quiz-branch-play'} aria-label={item.name}
                          data-tooltip={t('play_category', 'Play {{name}}', {name: item.name})}/>
                    <span className={'quiz-tile-content'}>
                        <FontAwesomeIcon icon={faChevronRight} className={'quiz-tile-caret'}/>
                        <Thumb category={item}/>
                        <span className={'quiz-tile-name'}>{item.name}</span>
                        <span className={'quiz-tile-count'}
                              aria-label={t('subcategories_count', '{{count}} subcategories', {count: item.children.length})}>
                            {item.children.length}
                        </span>
                        {playPill}
                    </span>
                </summary>
                <div className={'quiz-children'}>{item.children.map(renderNode)}</div>
            </details>
        )
        : (
            <Link
                key={item.catId}
                href={playHref(item)}
                className="quiz-tile"
                {...hoverProps(item)}
            >
                <span className={'quiz-tile-content'}>
                    {/* Empty caret slot, so leaf names line up with their parents'. */}
                    <span className={'quiz-tile-caret'} aria-hidden/>
                    <Thumb category={item}/>
                    <span className={'quiz-tile-name'}>{item.name}</span>
                    {playPill}
                </span>
            </Link>
        );

    // The server filters by a type's bit value (Q_QUIZ_TYPE.BIT_VALUE), not its id.
    const typeOptions = [{id: '0', name: 'All'}, ...(types ?? []).map(type => ({...type, id: String(type.bitValue)}))];

    return (
        <div className={'quiz-page'}>
            {/* Covers the layout's logo backdrop while a category is hovered. Only the newest
                layer shows; it fades in on mount while the ones under it fade out. */}
            {layers.map((item, index) => (
                <div key={item?.catId ?? 'none'}
                     className={'quiz-backdrop'}
                     data-shown={Boolean(item?.attachment) && index === layers.length - 1}
                     style={item?.attachment ? {backgroundImage: `url(${base64Util(item.attachment)})`} : undefined}
                />
            ))}

            <div className={'quiz-body'}>
                {/* Filters stack in the rail, so adding another is just another block. */}
                <aside className={'quiz-filters'} aria-labelledby={'quiz-filters-title'}>
                    <h2 id={'quiz-filters-title'} className={'quiz-filters-title'}>{t('parameters', 'Parameters')}</h2>
                    <Filter name={'quiz-type'}
                            label={t('quiz_type', 'Quiz type')}
                            options={typeOptions.map(type => ({value: type.id, label: t(type.name)}))}
                            value={quizType}
                            column
                            onChange={setQuizType}/>
                    <Filter name={'quiz-length'}
                            label={t('questions', 'Questions')}
                            options={LENGTHS.map(option => ({value: option.value, label: t(...option.label)}))}
                            value={length}
                            onChange={setLength}/>
                    <Filter name={'quiz-difficulty'}
                            label={t('difficulty', 'Difficulty')}
                            options={DIFFICULTIES.map(level => ({value: level.value, label: t(...level.label)}))}
                            value={complexity}
                            onChange={setComplexity}/>
                </aside>

                {/* Header shares the list's column, so both centre on the same axis. */}
                <div className={'quiz-main'}>
                    <header className={'quiz-hero'}>
                        <div className={'quiz-hero-icon'} aria-hidden><FontAwesomeIcon icon={faPuzzlePiece}/></div>
                        <div className={'quiz-hero-text'}>
                            <h1 className={'quiz-title'}>{t('take_quiz')}</h1>
                            <p className={'quiz-subtitle'}>
                                {t('take_quiz_subtitle', 'Pick a category and start playing.')}
                            </p>
                        </div>
                        <label className={'kb-search quiz-search'}>
                            <FontAwesomeIcon icon={faMagnifyingGlass} className={'kb-search-icon'}/>
                            <input type='search'
                                   value={query}
                                   onChange={(event) => setQuery(event.target.value)}
                                   onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
                                   placeholder={t('search_categories', 'Search categories…')}
                                   aria-label={t('search_categories', 'Search categories…')}/>
                            {query && (
                                <button type='button' className='kb-search-clear' onClick={() => setQuery('')}
                                        aria-label={t('clear_search', 'Clear search')}
                                        data-tooltip={t('clear_search', 'Clear search')}>
                                    <FontAwesomeIcon icon={faXmark}/>
                                </button>
                            )}
                        </label>
                    </header>

                    <div className={'quiz-list'}>
                        {visible.map(renderNode)}
                        {searching && !visible.length && (
                            <p className={'quiz-empty'}>
                                {t('no_categories_match', 'No categories match “{{query}}”.', {query: query.trim()})}
                            </p>
                        )}
                        {!searching && !visible.length && categories.length > 0 && (
                            <p className={'quiz-empty'}>
                                {t('no_categories_for_filters', 'No category has questions for this quiz type and difficulty yet.')}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Quiz;
