import React, { useEffect, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Table } from 'react-bootstrap';
import { Field, SaveButton } from '../../../components/admin/form-kit';
import getQuestionTypes from '../../../api/question/get-types';
import getQuestionAttributes from '../../../api/question/get-attributes';
import getLanguages from '../../../api/question/get-languages';
import saveQuestion from '../../../api/question/save';
import getQuestionPage from '../../../api/question/get-page';
import { Pagination, PAGE_SIZE } from '../../../components/admin/pagination';
import { EmptyRow, TableSearch } from '../../../components/admin/search';
import { SortHeader } from '../../../components/admin/sort';
import { RowActions } from '../../../components/admin/row-actions';
import { ConfirmDialog, Popup } from '../../../components/common/popup';
import { deleteQuestion, updateQuestion } from '../../../api/question/manage';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import { useDebounce } from 'primereact/hooks';
import {getQuizTypes} from "../../../api/quiz";
import {MultiSelect} from "primereact/multiselect";
import {Category} from "../../../interfaces/question";

// Edit popup body: the question's own fields. Answers and translations are not edited here
// (the server keeps them as they are).
const QuestionEditForm = ({ question, categories, types, attributesSet, onCancel, onSaved }) => {
  const [content, setContent] = useState(question.content ?? '');
  const [topic, setTopic] = useState(question.topic ?? '');
  const [type, setType] = useState(question.type ?? '');
  const [complexityLevel, setComplexityLevel] = useState(question.complexityLevel ?? 1);
  const [categoryId, setCategoryId] = useState(question.categoryId ?? '');
  const [attribute, setAttribute] = useState(question.attributes?.[0] ?? '');
  const [isActive, setIsActive] = useState(Boolean(question.isActive));
  const [saving, setSaving] = useState(false);

  const errors = {
    content: !content.trim() && 'Write the question',
    type: !type && 'Choose a type',
    complexityLevel: !complexityLevel && 'Set a complexity level',
  };

  const submit = async (event) => {
    event.preventDefault();
    if (Object.values(errors).some(Boolean)) return;

    setSaving(true);
    try {
      const response = await updateQuestion(question.id, {
        content: content.trim(),
        topic,
        type,
        complexityLevel: Number(complexityLevel),
        priority: question.priority,
        isActive,
        categoryId: categoryId ? Number(categoryId) : null,
        attributes: attribute ? [attribute] : [],
      });
      if (response) {
        toast.success('Question updated');
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form className="admin-form admin-popup-form" onSubmit={submit} noValidate>
      <Field label="Question" htmlFor="question-edit-content" error={errors.content}>
        <Form.Control id="question-edit-content" as="textarea" rows={2} value={content}
                      isInvalid={Boolean(errors.content)} onChange={(event) => setContent(event.target.value)}/>
      </Field>
      <div className="admin-form-grid">
        <Field label="Topic" htmlFor="question-edit-topic">
          <Form.Control id="question-edit-topic" value={topic} onChange={(event) => setTopic(event.target.value)}/>
        </Field>
        <Field label="Complexity level" htmlFor="question-edit-complexity" error={errors.complexityLevel}>
          <Form.Control id="question-edit-complexity" type="number" min={1} max={10} value={complexityLevel}
                        isInvalid={Boolean(errors.complexityLevel)}
                        onChange={(event) => setComplexityLevel(event.target.value)}/>
        </Field>
        <Field label="Type" htmlFor="question-edit-type" error={errors.type}>
          <Form.Select id="question-edit-type" value={type} isInvalid={Boolean(errors.type)}
                       onChange={(event) => setType(event.target.value)}>
            <option value="">Choose a type…</option>
            {types?.map(item => (<option value={item} key={item}>{item}</option>))}
          </Form.Select>
        </Field>
        <Field label="Category" htmlFor="question-edit-category">
          <Form.Select id="question-edit-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            {categories?.map(item => (<option value={item.catId} key={item.catId}>{item.name}</option>))}
          </Form.Select>
        </Field>
        <Field label="Attributes" htmlFor="question-edit-attributes" wide>
          <Form.Select id="question-edit-attributes" value={attribute} onChange={(event) => setAttribute(event.target.value)}>
            <option value="">None</option>
            {attributesSet?.map(item => (<option value={item} key={item}>{item}</option>))}
          </Form.Select>
        </Field>
      </div>
      <Form.Switch id="question-edit-active" className="admin-switch" label="Active"
                   checked={isActive} onChange={(event) => setIsActive(event.target.checked)}/>
      <p className="admin-field-hint">Answers and translations stay as they are.</p>
      <div className="popup-actions">
        <button type="button" className="popup-cancel" onClick={onCancel} disabled={saving}>Cancel</button>
        <SaveButton saving={saving} className="popup-confirm">Save changes</SaveButton>
      </div>
    </Form>
  );
};

export default function Question({
  categories,
  glossaries,
  setGlossaryFilter
}) {
  const [types, setTypes] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [quizTypes, setQuizTypes] = useState([]);
  const [attributesSet, setAttributesSet] = useState([]);

  const [type, setType] = useState('');
  const [topic, setTopic] = useState('');
  const [answer, setAnswer] = useState('');
  // Starts empty, as the select shows: it used to hold the first glossary unseen, so every
  // question silently got that term attached.
  const [glossary, setGlossary] = useState(undefined);
  const [priority, setPriority] = useState(1);
  const [attributes, setAttributes] = useState([]);
  const [excludeQuizTypes, setExcludeQuizTypes] = useState([]);
  const [translations, setTranslations] = useState({});
  const [isActive, setIsActive] = useState(false);
  const [complexityLevel, setComplexityLevel] = useState(1);
  const [category, setCategory] = useState<Category>();
  const [answerTranslations, setAnswerTranslations] = useState({});
  const [content, debouncedContent, setContent] = useDebounce('', 500);

  useEffect(() => {
    const fetchQuestionTypes = async () => await getQuestionTypes();
    fetchQuestionTypes().then(setTypes);
  }, []);

  useEffect(() => {
    const fetchQuestionLanguages = async () => await getLanguages();
    fetchQuestionLanguages().then(setLanguages);
  }, []);

  useEffect(() => {
    const fetchQuestionAttributes = async () => await getQuestionAttributes();
    fetchQuestionAttributes().then(setAttributesSet);
  }, []);

  // Paged on the server (1-based here, 0-based in the API): questions are the one admin list
  // that keeps growing, so only the visible page is fetched.
  const [questionPage, setQuestionPage] = useState(1);
  const [questionTotals, setQuestionTotals] = useState({ total: 0, pageCount: 1 });
  const [reloadQuestions, setReloadQuestions] = useState(0);
  // The search also runs on the server; typing settles for 300ms before a request goes out.
  const [questionSearch, debouncedQuestionSearch, setQuestionSearch] = useDebounce('', 300);

  // Sorted on the server too; no column picked means newest first.
  const [questionSort, setQuestionSort] = useState({ key: null, direction: 'asc' });
  const toggleQuestionSort = (key) => setQuestionSort(current => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));

  // Pencil opens the edit popup; trash opens the confirm, whose button deletes. Both reload
  // the page afterwards, since what the server sorts and counts has changed.
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    const question = pendingDelete;
    setDeleting(true);
    deleteQuestion(question.id)
      .then(response => {
        if (!response) return;
        toast.success('Question deleted');
        setReloadQuestions(value => value + 1);
      })
      .finally(() => {
        setDeleting(false);
        setPendingDelete(null);
      });
  };

  // A new search or order starts from its first page.
  useEffect(() => {
    setQuestionPage(1);
  }, [debouncedQuestionSearch, questionSort]);

  useEffect(() => {
    let current = true;
    getQuestionPage(questionPage - 1, PAGE_SIZE, debouncedQuestionSearch.trim(),
      questionSort.key, questionSort.direction).then(result => {
      if (!current || !result) return;
      setQuestions(result.content ?? []);
      setQuestionTotals({ total: result.totalElements, pageCount: Math.max(1, result.totalPages) });
    });
    return () => {
      current = false;
    };
  }, [questionPage, debouncedQuestionSearch, questionSort, reloadQuestions]);

  useEffect(() => {
    const fetchQuizTypes = async () => await getQuizTypes();
    fetchQuizTypes().then(setQuizTypes);
  }, []);

  useEffect(() => {
    if (category) {
      setGlossaryFilter(category.catId);
    }
  }, [category?.catId]);

  const handleTopic = (event) => setTopic(event.target.value);

  const handlePriority = (event) => setPriority(event.target.value);

  const handleIsActive = (event) => setIsActive(event.target.checked);

  const handleComplexityLevel = (event) => setComplexityLevel(event.target.value);

  const handleContent = (event) => setContent(event.target.value);

  const handleExcludeQuizType = (event) => setExcludeQuizTypes(event.value);

  const handleCategory = (event) => {
    const item = categories[event.target.value];
    setCategory(item);
  };

  const handleAnswer = (event) => setAnswer(event.target.value);

  const handleGlossary = (event) => setGlossary(event.target.value ? { termId: event.target.value } : undefined);

  const handleAttributes = (event) => {
    const value = event.target.value;
    setAttributes(value ? [value] : []);
  };

  const handleTranslation = (event, langId) => {
    setTranslations(values => ({
      ...values,
      [langId]: event.target.value
    }));
  };

  const handleAnswerTranslation = (event, langId) => {
    setAnswerTranslations(values => ({
      ...values,
      [langId]: event.target.value
    }));
  };

  const handleAttributeChange = (glossary) => {
    return attributes.includes('ANSWER_BY_KEY') ? glossary?.key : glossary?.value;
  };

  const [saving, setSaving] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [touched, setTouched] = useState(false);

  const errors = {
    content: !content && 'Write the question',
    answer: !answer && !glossary?.termId && 'Type an answer or pick one from the glossary',
    category: !category?.catId && 'Choose a category',
    type: !type && 'Choose a type',
    complexityLevel: !complexityLevel && 'Set a complexity level',
  };
  const valid = !Object.values(errors).some(Boolean);

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    try {
      await saveCurrent();
    } finally {
      setSaving(false);
    }
  };

  const saveCurrent = async () => {
    const translationEntries = Object.entries(translations);
    const answerEntries = Object.entries(answerTranslations);
    const response = await saveQuestion(
      {
        type,
        topic,
        content,
        isActive,
        priority,
        complexityLevel,
        excludeQuizTypes,
        attributes: Array.isArray(attributes) ? attributes : [attributes],
        categoryId: category.catId,
        categoryName: category.name,
        answers: [{
          content: answer,
          termId: glossary?.termId
        }],
        translations: translationEntries.map(e => ({
          description: e[1],
          language: { langId: e[0] }
        })),
        answerTranslations: answerEntries.map(e => ({
          description: e[1],
          language: { langId: e[0] }
        }))
      });

    if (response) {
      // Back to newest first, so the saved question is at the top of page 1.
      setQuestionSort({ key: null, direction: 'asc' });
      setQuestionPage(1);
      setReloadQuestions(value => value + 1);
      toast.success('Question successfully saved');
      setTouched(false);
    }
  };

  return (
    <div>
      <Form className={'shadowed admin-form'} onSubmit={save} noValidate>
        <h4>New question</h4>
        <hr/>

        <div className="admin-form-grid">
          <Field label="Question" htmlFor="question-content" wide error={touched && errors.content}>
            <Form.Control id="question-content"
                          as="textarea"
                          rows={2}
                          value={content}
                          isInvalid={touched && Boolean(errors.content)}
                          placeholder="e.g. What is the capital of Moldova?"
                          onChange={handleContent}/>
          </Field>

          <Field label="Topic" htmlFor="question-topic" hint="Optional.">
            <Form.Control id="question-topic"
                          value={topic}
                          placeholder="Topic"
                          onChange={handleTopic}/>
          </Field>

          <Field label="Complexity level" htmlFor="question-complexity" hint="1 (easy) to 10 (hard)."
                 error={touched && errors.complexityLevel}>
            <Form.Control id="question-complexity"
                          min={1}
                          max={10}
                          type={'number'}
                          value={complexityLevel}
                          isInvalid={touched && Boolean(errors.complexityLevel)}
                          onChange={handleComplexityLevel}/>
          </Field>

          <Field label="Category" htmlFor="question-category" error={touched && errors.category}>
            <Form.Select id="question-category"
                         isInvalid={touched && Boolean(errors.category)}
                         onChange={handleCategory}>
              <option value="">Choose a category…</option>
              {categories?.map((category, index) => (
                <option value={index} key={category.catId}>{category.name}</option>
              ))}
            </Form.Select>
          </Field>

          <Field label="Type" htmlFor="question-type" error={touched && errors.type}>
            <Form.Select id="question-type"
                         isInvalid={touched && Boolean(errors.type)}
                         onChange={(event) => setType((event.target.value))}>
              <option value="">Choose a type…</option>
              {types?.map(item => (
                <option value={item} key={item}>{item}</option>
              ))}
            </Form.Select>
          </Field>

          <Field label="Attributes" htmlFor="question-attributes">
            <Form.Select id="question-attributes" onChange={handleAttributes}>
              <option value="">None</option>
              {attributesSet?.map(item => (
                <option value={item} key={item}>{item}</option>
              ))}
            </Form.Select>
          </Field>

          <Field label="Exclude quiz types" htmlFor="question-exclude" hint="The question never appears in these quiz types.">
            <MultiSelect
                inputId="question-exclude"
                value={excludeQuizTypes}
                onChange={handleExcludeQuizType}
                options={quizTypes}
                optionLabel="label"
                display="chip"
                placeholder="None"
                focusOnHover={false}
                className="w-100"/>
          </Field>

          {/* Either a typed answer or a glossary term. */}
          <div className="admin-answer" data-wide="true">
            <Field label="Answer" htmlFor="question-answer">
              <Form.Control id="question-answer"
                            value={answer}
                            isInvalid={touched && Boolean(errors.answer)}
                            placeholder="Type the answer"
                            onChange={handleAnswer}/>
            </Field>
            <span className="admin-answer-or" aria-hidden>or</span>
            <Field label="From glossary" htmlFor="question-glossary">
              <Form.Select id="question-glossary"
                           isInvalid={touched && Boolean(errors.answer)}
                           onChange={handleGlossary}>
                <option value="">None</option>
                {glossaries?.map(glossary => (
                  <option value={glossary.termId}
                          key={glossary.termId}>{handleAttributeChange(glossary)}</option>
                ))}
              </Form.Select>
            </Field>
            {touched && errors.answer && <div className="invalid-feedback d-block admin-answer-error">{errors.answer}</div>}
          </div>

          {languages?.length > 0 && (
            <fieldset className="admin-translations" data-wide="true">
              <legend className="form-label">Question translations</legend>
              <div className="admin-translations-grid">
                {languages.map(item => (
                  <label key={item.name} className="admin-translation">
                    <span className="admin-translation-lang">{item.name}</span>
                    <Form.Control placeholder={`Question in ${item.name}`}
                                  onChange={(e) => handleTranslation(e, item.langId)}/>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {answer && languages?.length > 0 && (
            <fieldset className="admin-translations" data-wide="true">
              <legend className="form-label">Answer translations</legend>
              <div className="admin-translations-grid">
                {languages.map(item => (
                  <label key={item.name} className="admin-translation">
                    <span className="admin-translation-lang">{item.name}</span>
                    <Form.Control placeholder={`Answer in ${item.name}`}
                                  onChange={(e) => handleAnswerTranslation(e, item.langId)}/>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        <Form.Switch id="question-active" className="admin-switch" label="Active"
                     checked={isActive} onChange={handleIsActive}/>

        <div className="admin-form-actions">
          <SaveButton saving={saving}>Save question</SaveButton>
        </div>
      </Form>
      <div className={'shadowed'}>
        <h4 className={'text-center'}>Questions</h4>
        <hr/>
        <TableSearch value={questionSearch} onChange={setQuestionSearch}
                     placeholder="Search by question, topic or category…"
                     count={debouncedQuestionSearch.trim() ? questionTotals.total : undefined}
                     label="Search questions"/>
        <Table striped bordered variant="dark">
          <thead>
          <tr>
            <SortHeader column="topic" sort={questionSort} onSort={toggleQuestionSort}>Topic</SortHeader>
            <SortHeader column="priority" sort={questionSort} onSort={toggleQuestionSort}>Priority</SortHeader>
            <SortHeader column="type" sort={questionSort} onSort={toggleQuestionSort}>Type</SortHeader>
            <SortHeader column="complexityLevel" sort={questionSort} onSort={toggleQuestionSort}>Complexity level</SortHeader>
            <SortHeader column="content" sort={questionSort} onSort={toggleQuestionSort}>Content</SortHeader>
            <SortHeader column="category" sort={questionSort} onSort={toggleQuestionSort}>Category</SortHeader>
            <th>Attributes</th>
            <SortHeader column="isActive" sort={questionSort} onSort={toggleQuestionSort}>Is Active</SortHeader>
            <th className="text-center"><span className="visually-hidden">Actions</span></th>
          </tr>
          </thead>
          <tbody>
          {questions?.map((question) => (
            <tr key={question.id}>
              <td>{question.topic}</td>
              <td>{question.priority}</td>
              <td>{question.type}</td>
              <td>{question.complexityLevel}</td>
              <td>{question.content}</td>
              <td>{question.categoryName}</td>
              <td>{question.attributes?.map(attribute => (
                <div key={attribute}>{attribute}</div>
              ))}
              </td>
              <td>
                <Form.Switch
                  disabled
                  readOnly
                  checked={Boolean(question.isActive)}
                />
              </td>
              <RowActions name={question.content}
                          onEdit={() => setEditingQuestion(question)}
                          onDelete={() => setPendingDelete(question)}
                          busy={deleting && pendingDelete?.id === question.id}/>
            </tr>
          ))}
            <EmptyRow show={!questions.length} columns={9} query={debouncedQuestionSearch.trim()} what="questions"/>
          </tbody>
        </Table>
        <Pagination page={questionPage}
                    pageCount={questionTotals.pageCount}
                    total={questionTotals.total}
                    onChange={setQuestionPage}
                    label="Questions pages"/>

        <ConfirmDialog open={Boolean(pendingDelete)}
                       danger
                       busy={deleting}
                       title="Delete question?"
                       message={pendingDelete && <>
                         “{pendingDelete.content}” will be permanently deleted, with its answers and
                         translations. This can’t be undone.
                       </>}
                       confirmLabel="Delete"
                       onConfirm={confirmDelete}
                       onCancel={() => setPendingDelete(null)}/>
        <Popup open={Boolean(editingQuestion)} icon={faPen} title="Edit question" onClose={() => setEditingQuestion(null)}>
          {editingQuestion && (
            <QuestionEditForm question={editingQuestion}
                              categories={categories}
                              types={types}
                              attributesSet={attributesSet}
                              onCancel={() => setEditingQuestion(null)}
                              onSaved={() => {
                                setEditingQuestion(null);
                                setReloadQuestions(value => value + 1);
                              }}/>
          )}
        </Popup>
      </div>
    </div>
  );
}
