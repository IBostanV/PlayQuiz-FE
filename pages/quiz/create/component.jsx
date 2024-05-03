import React, {useEffect, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {useRouter} from 'next/router';
import {useTranslation} from 'react-i18next';
import {toast} from 'react-toastify';
import {Dropdown} from 'primereact/dropdown';
import {MultiSelect} from 'primereact/multiselect';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faMagnifyingGlass, faPlus, faTrashCan, faUsers, faWandMagicSparkles, faXmark
} from '@fortawesome/free-solid-svg-icons';
import getCategories from '../../../api/category/get-all';
import {createCustomQuiz, getQuizTypes} from '../../../api/quiz';
import {getAllUsers} from '../../../api/user';
import getUserGroups from '../../../api/user/getUserGroups';
import {Avatar} from '../../../components/common/avatar';
import {groupTitle, toGroups} from '../../../utils/groups';

// The server's own caps (CustomQuizDto).
const MAX_QUESTIONS = 50;
const MAX_ANSWERS = 10;

// The quiz types a player can pick for questions they write, and what a question takes in each.
// Mirrors CUSTOM_QUIZ_TYPES in the server's CustomQuizServiceImpl, which rejects anything else. Map,
// value range and drag and drop need data a written question does not have, so they are not offered.
// `right` names how the right-answer list reads; `wrong` is 'some' (at least one), 'one' or 'none'.
const TYPE_RULES = {
    SINGLE_CHOICE: {
        minRight: 1, maxRight: 1, right: 'single', wrong: 'some',
        hint: ['type_hint_single', 'Players pick the one right answer.'],
    },
    MULTIPLE_CHOICE: {
        minRight: 1, maxRight: MAX_ANSWERS, right: 'many', wrong: 'some',
        hint: ['type_hint_multiple', 'Players pick every right answer.'],
    },
    ONE_FROM_TWO: {
        minRight: 1, maxRight: 1, right: 'single', wrong: 'one',
        hint: ['type_hint_one_from_two', 'Players choose between the right answer and one wrong option.'],
    },
    INPUT: {
        minRight: 1, maxRight: MAX_ANSWERS, right: 'accepted', wrong: 'none',
        hint: ['type_hint_input', 'Players type the answer; any accepted spelling counts, whatever the case.'],
    },
    IN_ORDER: {
        minRight: 2, maxRight: MAX_ANSWERS, right: 'order', wrong: 'none',
        hint: ['type_hint_in_order', 'Players put the items in the order you write them.'],
    },
};

// How each kind of right-answer list reads; i18n keys with their defaults.
const RIGHT_LISTS = {
    single: {
        label: ['right_answer', 'Right answer'],
        item: ['right_answer', 'Right answer'],
        placeholder: ['answer_placeholder', 'e.g. Chisinau'],
    },
    many: {
        label: ['right_answers', 'Right answers'],
        item: ['right_answer_number', 'Right answer {{number}}'],
        placeholder: ['answer_placeholder', 'e.g. Chisinau'],
        add: ['add_answer', 'Add another right answer'],
    },
    accepted: {
        label: ['accepted_answers', 'Accepted answers'],
        item: ['accepted_answer_number', 'Accepted answer {{number}}'],
        placeholder: ['answer_placeholder', 'e.g. Chisinau'],
        add: ['add_accepted_answer', 'Add another accepted spelling'],
    },
    order: {
        label: ['items_in_order', 'Items, in the right order'],
        item: ['item_number', 'Item {{number}}'],
        placeholder: ['item_placeholder', 'e.g. Bronze Age'],
        add: ['add_item', 'Add another item'],
    },
};

const WRONG_LISTS = {
    some: {
        label: ['wrong_options', 'Wrong options'],
        item: ['wrong_option_number', 'Wrong option {{number}}'],
        placeholder: ['wrong_option_placeholder', 'e.g. Balti'],
        add: ['add_wrong_option', 'Add another wrong option'],
    },
    one: {
        label: ['wrong_option', 'Wrong option'],
        item: ['wrong_option', 'Wrong option'],
        placeholder: ['wrong_option_placeholder', 'e.g. Balti'],
    },
};

const emptyQuestion = () => ({content: '', answers: [''], wrongAnswers: ['']});

// Blank boxes are ignored, so an unused extra box never blocks saving.
const filled = (values) => values.map(value => value.trim()).filter(Boolean);

// Build your own quiz: the player picks how it is played, writes the questions, and the user list
// decides who is invited. One POST saves the questions, the quiz and the invites.
function CreateQuiz({isLoggedIn}) {
    const router = useRouter();
    const {t} = useTranslation();

    const [categories, setCategories] = useState([]);
    const [quizTypes, setQuizTypes] = useState([]);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [group, setGroup] = useState(null);

    const [quizTypeId, setQuizTypeId] = useState(null);
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [timePerQuestion, setTimePerQuestion] = useState(30);
    const [categoryIds, setCategoryIds] = useState([]);
    const [invited, setInvited] = useState([]);

    const [query, setQuery] = useState('');
    const [touched, setTouched] = useState(false);
    const [saving, setSaving] = useState(false);

    // Signed out there is nothing to create with, and no one to invite.
    useEffect(() => {
        if (!isLoggedIn) router.replace('/login');
    }, [isLoggedIn]);

    useEffect(() => {
        getCategories().then(list => setCategories(list ?? []));
        getAllUsers().then(list => setUsers(list ?? []));
        getUserGroups().then(rows => setGroups(toGroups(rows)));
        // Only the types a written question can be played as; the first one starts picked.
        getQuizTypes().then(list => {
            const offered = (list ?? []).filter(type => TYPE_RULES[type.name]);
            setQuizTypes(offered);
            setQuizTypeId(current => current ?? offered[0]?.id ?? null);
        });
    }, []);

    const quizType = quizTypes.find(type => type.id === quizTypeId);
    const rules = TYPE_RULES[quizType?.name] ?? TYPE_RULES.SINGLE_CHOICE;
    const rightList = {list: 'answers', kind: 'right', max: rules.maxRight, ...RIGHT_LISTS[rules.right]};
    const wrongList = rules.wrong === 'none'
        ? null
        : {list: 'wrongAnswers', kind: 'wrong', max: rules.wrong === 'one' ? 1 : MAX_ANSWERS, ...WRONG_LISTS[rules.wrong]};

    // Everyone but the signed-in user; the same id the friends panel reads.
    const currentUserId = typeof window === 'undefined' ? null : Number(localStorage.getItem('userId'));
    const candidates = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return users
            .filter(user => user.id !== currentUserId)
            .filter(user => !needle || user.displayName?.toLowerCase().includes(needle));
    }, [users, query, currentUserId]);

    const toggle = (list, value) => list.includes(value)
        ? list.filter(item => item !== value)
        : [...list, value];

    // A group is a shortcut, not a third thing to send: picking one ticks its members in the
    // list below, so what gets invited is always what is shown as ticked.
    const inviteGroup = () => {
        const picked = groups.find(item => item.groupId === group);
        if (!picked) return;
        setInvited(list => [...new Set([...list, ...picked.memberIds])]);
        setGroup(null);
    };

    // Questions are edited in place by index; each change replaces just that one.
    const updateQuestion = (index, change) =>
        setQuestions(list => list.map((question, at) => at === index ? change(question) : question));
    // `list` is 'answers' or 'wrongAnswers': both are edited the same way.
    const editList = (index, list, change) =>
        updateQuestion(index, question => ({...question, [list]: change(question[list])}));

    // A wrong-option list the type does not use is left out, even if something was typed there
    // under another type.
    const wrongOf = (question) => wrongList ? filled(question.wrongAnswers) : [];

    // Judged against the picked type, so switching type re-checks every question.
    const questionError = (question) => {
        if (!question.content.trim()) return t('question_content_error', 'Write the question');
        const right = filled(question.answers);
        if (right.length < rules.minRight) {
            return rules.minRight > 1
                ? t('question_items_error', 'Add at least two items')
                : t('question_answer_error', 'Add at least one right answer');
        }
        if (right.length > rules.maxRight) {
            return t('question_one_answer_error', 'This quiz type takes one right answer');
        }
        const wrong = wrongOf(question);
        if (rules.wrong === 'some' && !wrong.length) {
            return t('question_wrong_error', 'Add at least one wrong option to choose from');
        }
        if (rules.wrong === 'one' && wrong.length !== 1) {
            return t('question_one_wrong_error', 'This quiz type takes exactly one wrong option');
        }
        // The same text on both sides would be dropped from the options when played.
        const rightTexts = new Set(right.map(answer => answer.toLowerCase()));
        if (wrong.some(option => rightTexts.has(option.toLowerCase()))) {
            return t('question_wrong_matches_right', 'A wrong option is the same as a right answer');
        }
        return null;
    };

    const errors = {
        quizType: !quizTypeId && t('quiz_type_error', 'Pick how the quiz is played'),
        timePerQuestion: (timePerQuestion < 5 || timePerQuestion > 300) && t('quiz_time_error', 'Between 5 and 300 seconds'),
        categoryIds: !categoryIds.length && t('quiz_category_error', 'Pick at least one category'),
        questions: questions.some(questionError),
    };
    const valid = !Object.values(errors).some(Boolean);

    // One answer list under a question: a box per value, remove while more than one, add up to its max.
    const renderAnswers = (question, index, {list, kind, max, label, placeholder, item, add}) => (
        <>
            <span className={'create-quiz-label'}>{t(...label)}</span>
            {question[list].map((value, at) => (
                <div key={at} className={'create-quiz-answer'} data-kind={kind}>
                    <input type={'text'} value={value} maxLength={1000}
                           placeholder={t(...placeholder)}
                           aria-label={t(item[0], item[1], {number: at + 1})}
                           onChange={(event) => editList(index, list, values =>
                               values.map((current, position) => position === at ? event.target.value : current))}/>
                    {question[list].length > 1 && (
                        <button type={'button'} className={'create-quiz-icon-button'}
                                onClick={() => editList(index, list, values => values.filter((_, position) => position !== at))}
                                aria-label={t('remove_item', 'Remove {{name}}', {name: t(item[0], item[1], {number: at + 1})})}>
                            <FontAwesomeIcon icon={faXmark}/>
                        </button>
                    )}
                </div>
            ))}
            {add && question[list].length < max && (
                <button type={'button'} className={'create-quiz-add-answer'}
                        onClick={() => editList(index, list, values => [...values, ''])}>
                    <FontAwesomeIcon icon={faPlus}/>
                    <span>{t(...add)}</span>
                </button>
            )}
        </>
    );

    const submit = (event) => {
        event.preventDefault();
        setTouched(true);
        if (!valid) return;

        setSaving(true);
        createCustomQuiz({
            quizTypeId,
            questions: questions.map(question => ({
                content: question.content.trim(),
                answers: filled(question.answers),
                wrongAnswers: wrongOf(question),
            })),
            timePerQuestion: Number(timePerQuestion),
            categoryIds,
            invitedUserIds: invited,
        })
            .then(quiz => {
                if (!quiz) return;
                toast.success(invited.length
                    ? t('quiz_created_invited', 'Quiz created, {{count}} invites sent', {count: invited.length})
                    : t('quiz_created', 'Quiz created'));
                // Straight to the quiz: its address is what the creator can share.
                router.push(`/quiz/custom/${quiz.quizId}`);
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className={'quiz-page'}>
            <form className={'create-quiz'} onSubmit={submit} noValidate>
                {/* The badge on the left, the title over its subtitle on the right. */}
                <header className={'quiz-hero mb-4'}>
                    <div className={'quiz-hero-icon'} aria-hidden><FontAwesomeIcon icon={faWandMagicSparkles}/></div>
                    <div className={'quiz-hero-text'}>
                        <h2 className={'quiz-title'}>{t('create_quiz', 'Create a quiz')}</h2>
                        <p className={'quiz-subtitle'}>
                            {t('create_quiz_subtitle', 'Write your questions, then invite people to take it.')}
                        </p>
                    </div>
                </header>

                <section className={'create-quiz-panel'}>
                    <h2 className={'create-quiz-heading'}>{t('quiz_settings', 'Settings')}</h2>

                    <div className={'create-quiz-grid'}>
                        {/* How every question is played; the question editor below follows it. */}
                        <fieldset className={'create-quiz-field'} data-wide={'true'}>
                            <legend className={'create-quiz-label'}>{t('quiz_type', 'Quiz type')}</legend>
                            <div className={'quiz-type-options'}>
                                {quizTypes.map(type => (
                                    <label key={type.id} className={'quiz-type-option'}>
                                        <input type={'radio'} name={'create-quiz-type'} value={type.id}
                                               checked={quizTypeId === type.id}
                                               onChange={() => setQuizTypeId(type.id)}/>
                                        <span>{t(type.name, type.label)}</span>
                                    </label>
                                ))}
                            </div>
                            {quizType && <span className={'create-quiz-hint'}>{t(...rules.hint)}</span>}
                            {touched && errors.quizType &&
                                <span className={'create-quiz-error'}>{errors.quizType}</span>}
                        </fieldset>

                        <label className={'create-quiz-field'}>
                            <span className={'create-quiz-label'}>{t('time_per_question', 'Seconds per question')}</span>
                            <input type={'number'} min={5} max={300} step={5} value={timePerQuestion}
                                   onChange={(event) => setTimePerQuestion(event.target.value)}/>
                            {touched && errors.timePerQuestion &&
                                <span className={'create-quiz-error'}>{errors.timePerQuestion}</span>}
                        </label>

                        <div className={'create-quiz-field'}>
                            <span className={'create-quiz-label'} id={'create-quiz-categories'}>
                                {t('categories', 'Categories')}
                            </span>
                            <MultiSelect value={categoryIds}
                                         options={categories}
                                         optionLabel={'name'}
                                         optionValue={'catId'}
                                         onChange={(event) => setCategoryIds(event.value)}
                                         filter
                                         display={'chip'}
                                         ariaLabelledBy={'create-quiz-categories'}
                                         placeholder={t('choose_categories', 'Choose one or more')}
                                         emptyMessage={t('no_categories', 'No categories')}/>
                            {touched && errors.categoryIds &&
                                <span className={'create-quiz-error'}>{errors.categoryIds}</span>}
                        </div>
                    </div>
                </section>

                <section className={'create-quiz-panel'}>
                    <h2 className={'create-quiz-heading'}>
                        {t('questions', 'Questions')}
                        <span className={'create-quiz-count'}>{questions.length}</span>
                    </h2>

                    <ol className={'create-quiz-questions'}>
                        {questions.map((question, index) => (
                            <li key={index} className={'create-quiz-question'}>
                                <div className={'create-quiz-question-head'}>
                                    <span className={'create-quiz-label'}>
                                        {t('question_number', 'Question {{number}}', {number: index + 1})}
                                    </span>
                                    {questions.length > 1 && (
                                        <button type={'button'} className={'create-quiz-icon-button'}
                                                onClick={() => setQuestions(list => list.filter((_, at) => at !== index))}
                                                aria-label={t('remove_question', 'Remove question {{number}}', {number: index + 1})}
                                                data-tooltip={t('remove', 'Remove')}>
                                            <FontAwesomeIcon icon={faTrashCan}/>
                                        </button>
                                    )}
                                </div>

                                <textarea className={'create-quiz-textarea'} rows={2} maxLength={1000}
                                          value={question.content}
                                          placeholder={t('question_placeholder', 'e.g. What is the capital of Moldova?')}
                                          aria-label={t('question_number', 'Question {{number}}', {number: index + 1})}
                                          onChange={(event) => updateQuestion(index, current =>
                                              ({...current, content: event.target.value}))}/>

                                {renderAnswers(question, index, rightList)}
                                {wrongList && renderAnswers(question, index, wrongList)}

                                {touched && questionError(question) &&
                                    <span className={'create-quiz-error'}>{questionError(question)}</span>}
                            </li>
                        ))}
                    </ol>

                    {questions.length < MAX_QUESTIONS && (
                        <button type={'button'} className={'create-quiz-add-question'}
                                onClick={() => setQuestions(list => [...list, emptyQuestion()])}>
                            <FontAwesomeIcon icon={faPlus}/>
                            <span>{t('add_question', 'Add question')}</span>
                        </button>
                    )}
                </section>

                <section className={'create-quiz-panel'}>
                    <h2 className={'create-quiz-heading'}>
                        {t('invite_players', 'Invite players')}
                        <span className={'create-quiz-count'}>{invited.length}</span>
                    </h2>

                    {groups.length > 0 && (
                        <div className={'create-quiz-group'}>
                            <Dropdown value={group}
                                      options={groups.map(item => ({
                                          value: item.groupId,
                                          label: groupTitle(item, t('chat', 'Chat')),
                                      }))}
                                      onChange={(event) => setGroup(event.value)}
                                      filter
                                      placeholder={t('invite_a_group', 'Invite a group')}
                                      aria-label={t('invite_a_group', 'Invite a group')}
                                      emptyMessage={t('no_groups', 'No groups')}
                                      emptyFilterMessage={t('no_matches', 'No matches')}/>
                            <button type={'button'} className={'create-quiz-group-add'} onClick={inviteGroup}
                                    disabled={!group}>
                                <FontAwesomeIcon icon={faUsers}/>
                                <span>{t('add_members', 'Add members')}</span>
                            </button>
                        </div>
                    )}

                    <label className={'kb-search create-quiz-search'}>
                        <FontAwesomeIcon icon={faMagnifyingGlass} className={'kb-search-icon'}/>
                        <input type={'search'} value={query}
                               onChange={(event) => setQuery(event.target.value)}
                               onKeyDown={(event) => event.key === 'Escape' && setQuery('')}
                               placeholder={t('search_people', 'Search people')}
                               aria-label={t('search_people', 'Search people')}/>
                        {query && (
                            <button type={'button'} className={'kb-search-clear'} onClick={() => setQuery('')}
                                    aria-label={t('clear_search', 'Clear search')}>
                                <FontAwesomeIcon icon={faXmark}/>
                            </button>
                        )}
                    </label>

                    {candidates.length ? (
                        <ul className={'create-quiz-users'}>
                            {candidates.map(user => (
                                <li key={user.id}>
                                    <label className={'create-quiz-user'}>
                                        <input type={'checkbox'}
                                               checked={invited.includes(user.id)}
                                               onChange={() => setInvited(list => toggle(list, user.id))}/>
                                        <Avatar name={user.displayName}/>
                                        <span className={'create-quiz-user-name'}>{user.displayName}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={'quiz-empty'}>{t('no_people', 'No one to invite')}</p>
                    )}
                </section>

                <div className={'create-quiz-actions'}>
                    <button type={'submit'} className={'create-quiz-submit'} disabled={saving}>
                        <FontAwesomeIcon icon={faWandMagicSparkles}/>
                        <span>{saving ? t('saving', 'Saving') : t('create_quiz', 'Create a quiz')}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

CreateQuiz.propTypes = {
    isLoggedIn: PropTypes.bool,
};

export default CreateQuiz;
