import Form from 'react-bootstrap/Form';
import { Button } from 'react-bootstrap';
import React, { useState } from 'react';
import { saveKnowledgeBaseRecord } from '../../../api/knowledge-base';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { KnowledgeBaseRecord } from '../../../components/domain/knowledge-base-record';
import { setWIthPreview } from '../../../utils/fileUtils';
import { KNOWLEDGE_BASE_STATUSES, KnowledgeBaseStatusEnum } from '../../../components/enums/knowledge-base-status-enum';
import { Editor } from 'primereact/editor';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faXmark } from '@fortawesome/free-solid-svg-icons';
import { CoverImage } from '../../../components/admin/form-kit';
import { splitTags } from '../../../components/knowledge-base/helpers';

// Quill leaves "<p><br></p>" behind in an empty editor.
const isBlank = (html) => !html || !html.replace(/<[^>]*>/g, '').trim();

// Tags as chips: Enter or comma adds the typed tag, Backspace in an empty field removes the
// last one. Stored as the comma-separated string the TAGS column holds.
const TagsInput = ({ id, value, onChange }) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const tags = splitTags(value);

  const commit = () => {
    const tag = draft.trim().replace(/,/g, '');
    if (tag && !tags.includes(tag)) onChange([...tags, tag].join(', '));
    setDraft('');
  };

  const remove = (tag) => onChange(tags.filter(item => item !== tag).join(', '));

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && !draft && tags.length) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div className="kb-tags-input">
      {tags.map(tag => (
        <span key={tag} className="kb-tags-chip">
          #{tag}
          <button type="button" onClick={() => remove(tag)} aria-label={t('content_remove_tag', 'Remove tag {{tag}}', { tag, interpolation: { escapeValue: false } })}>
            <FontAwesomeIcon icon={faXmark}/>
          </button>
        </span>
      ))}
      <input id={id}
             value={draft}
             onChange={(event) => setDraft(event.target.value)}
             onKeyDown={onKeyDown}
             onBlur={commit}
             placeholder={tags.length ? '' : t('content_tag_placeholder', 'Type a tag, press Enter')}/>
    </div>
  );
};

const EMPTY = { title: '', content: '', tags: '', categoryId: '', visible: true };

const KnowledgeBaseAdmin = ({ categories }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(KnowledgeBaseStatusEnum.DRAFT);
  const [attachment, setAttachment] = useState(null);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [saving, setSaving] = useState(false);
  // Validation messages appear after the first save attempt, not while typing a fresh form.
  const [touched, setTouched] = useState(false);
  // Remounts the editor on reset: PrimeReact's Editor does not clear from an empty value prop.
  const [editorKey, setEditorKey] = useState(0);

  const set = (field) => (value) => setForm(current => ({ ...current, [field]: value }));

  const setImage = (file) => setWIthPreview({ target: { files: [file] } }, attachment, setAttachment, setPreviewAttachment);
  const clearImage = () => {
    setAttachment(null);
    setPreviewAttachment(null);
  };

  const errors = {
    title: !form.title.trim() && t('content_article_title_error', 'Give the article a title'),
    content: isBlank(form.content) && t('content_article_content_error', 'Write some content'),
    categoryId: !form.categoryId && t('content_article_category_error', 'Choose a category'),
  };
  const valid = !errors.title && !errors.content && !errors.categoryId;

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;

    setSaving(true);
    try {
      const record = new KnowledgeBaseRecord(Number(form.categoryId), form.content, form.tags, form.title.trim(),
        form.visible, status);
      const result = await saveKnowledgeBaseRecord(record, attachment);
      if (result) {
        toast.success(status === KnowledgeBaseStatusEnum.ACTIVE
          ? t('content_article_published', 'Article published')
          : t('content_article_saved', 'Article saved — set it to Active to publish'));
        // Ready for the next article; category and status are usually the same again.
        setForm({ ...EMPTY, categoryId: form.categoryId });
        clearImage();
        setTouched(false);
        setEditorKey(key => key + 1);
      }
    } finally {
      setSaving(false);
    }
  };

  // Label and hint per status, translated; the enum's own English ones are the fallback.
  const statusText = {
    [KnowledgeBaseStatusEnum.DRAFT]: {
      label: t('content_kb_status_draft', 'Draft'),
      hint: t('content_kb_status_draft_hint', 'Still being written. Not shown to readers.'),
    },
    [KnowledgeBaseStatusEnum.ACTIVE]: {
      label: t('content_kb_status_active', 'Active'),
      hint: t('content_kb_status_active_hint', 'Published: shown in the Wiki.'),
    },
    [KnowledgeBaseStatusEnum.PENDING]: {
      label: t('content_kb_status_pending', 'Pending review'),
      hint: t('content_kb_status_pending_hint', 'Waiting for review. Not shown to readers.'),
    },
    [KnowledgeBaseStatusEnum.HIDDEN]: {
      label: t('content_kb_status_hidden', 'Hidden'),
      hint: t('content_kb_status_hidden_hint', 'Taken down but kept. Not shown to readers.'),
    },
    [KnowledgeBaseStatusEnum.INTERNAL]: {
      label: t('content_kb_status_internal', 'Internal'),
      hint: t('content_kb_status_internal_hint', 'For the team only. Not shown to readers.'),
    },
  };
  const statusHint = statusText[status]?.hint ?? KNOWLEDGE_BASE_STATUSES.find(item => item.value === status)?.hint;

  return (
    <Form className="kb-editor" onSubmit={submit} noValidate>
      <section className="shadowed kb-editor-main">
        <h4>{t('content_new_article', 'New article')}</h4>
        <hr/>

        <Form.Group className="mb-3">
          <Form.Label htmlFor="kb-title">{t('content_title', 'Title')}</Form.Label>
          <Form.Control id="kb-title"
                        className="kb-editor-title"
                        value={form.title}
                        isInvalid={touched && Boolean(errors.title)}
                        placeholder={t('content_article_title_placeholder', 'e.g. How scoring works in Express quiz')}
                        onChange={(event) => set('title')(event.target.value)}/>
          <Form.Control.Feedback type="invalid">{errors.title}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{t('content_content', 'Content')}</Form.Label>
          <div className="kb-editor-content" data-invalid={touched && Boolean(errors.content)}>
            <Editor key={editorKey}
                    value={form.content}
                    onTextChange={(e) => set('content')(e.htmlValue ?? '')}
                    style={{ height: '380px' }}/>
          </div>
          {touched && errors.content && <div className="invalid-feedback d-block">{errors.content}</div>}
        </Form.Group>
      </section>

      <aside className="shadowed kb-editor-side">
        <h4>{t('content_publishing', 'Publishing')}</h4>
        <hr/>

        <fieldset className="mb-3">
          <legend className="form-label">{t('content_status', 'Status')}</legend>
          <div className="kb-status-options" role="radiogroup" aria-describedby="kb-status-hint">
            {KNOWLEDGE_BASE_STATUSES.map(item => (
              <label key={item.value} className="kb-status-option" data-status={item.value}>
                <input type="radio" name="kb-status" value={item.value}
                       checked={status === item.value}
                       onChange={() => setStatus(item.value)}/>
                <span className="kb-status-dot" aria-hidden/>
                <span className="kb-status-label">{statusText[item.value]?.label ?? item.label}</span>
              </label>
            ))}
          </div>
          {/* Says whether readers will see it, so "Draft" is not mistaken for published. */}
          <Form.Text id="kb-status-hint" className="kb-status-hint"
                     data-published={status === KnowledgeBaseStatusEnum.ACTIVE}>
            {statusHint}
          </Form.Text>
        </fieldset>

        <Form.Group className="mb-3">
          <Form.Label htmlFor="kb-category">{t('content_category', 'Category')}</Form.Label>
          <Form.Select id="kb-category"
                       value={form.categoryId}
                       isInvalid={touched && Boolean(errors.categoryId)}
                       onChange={(event) => set('categoryId')(event.target.value)}>
            <option value="">{t('content_choose_category', 'Choose a category…')}</option>
            {categories?.map(item => (<option value={item.catId} key={item.catId}>{item.name}</option>))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">{errors.categoryId}</Form.Control.Feedback>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label htmlFor="kb-tags">{t('content_tags', 'Tags')}</Form.Label>
          <TagsInput id="kb-tags" value={form.tags} onChange={set('tags')}/>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>{t('content_cover_image', 'Cover image')}</Form.Label>
          <CoverImage preview={previewAttachment} onFile={setImage} onClear={clearImage}/>
        </Form.Group>

        <Form.Group className="mb-3 kb-visible">
          <Form.Switch id="kb-visible"
                       label={t('content_visible_to_readers', 'Visible to readers')}
                       checked={form.visible}
                       onChange={(event) => set('visible')(event.target.checked)}/>
        </Form.Group>

        <Button type="submit" variant="primary" className="kb-editor-save" disabled={saving}>
          {saving ? <span className="auth-spinner" aria-hidden/> : <FontAwesomeIcon icon={faFloppyDisk}/>}
          {status === KnowledgeBaseStatusEnum.ACTIVE ? t('content_publish', 'Publish') : t('save', 'Save')}
        </Button>
      </aside>
    </Form>
  );
};

export default KnowledgeBaseAdmin;
