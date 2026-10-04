import React, { useRef, useState } from 'react';
import { deleteCategory, saveCategory, updateCategory } from '../../../api/category';
import { faPen } from '@fortawesome/free-solid-svg-icons';
import { ConfirmDialog, Popup } from '../../../components/common/popup';
import { RowActions } from '../../../components/admin/row-actions';
import Form from 'react-bootstrap/Form';
import { Image, Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import base64Util from '../../../utils/base64Util';
import { CoverImage, Field, readPreview, SaveButton } from '../../../components/admin/form-kit';
import { Pagination, PAGE_SIZE, usePagination } from '../../../components/admin/pagination';
import { EmptyRow, TableSearch, useSearch } from '../../../components/admin/search';
import { SortHeader, useSort } from '../../../components/admin/sort';
import { formatDate, toDate } from '../../../utils/toDate';

// Edit popup body: name, parent (never itself), visibility, and the image, which is only
// replaced when a new one is picked.
const CategoryEditForm = ({ category, categories, onCancel, onSaved }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(category.name ?? '');
  const [parentId, setParentId] = useState(category.parentId ?? '');
  const [visible, setVisible] = useState(Boolean(category.visible));
  const [attachment, setAttachment] = useState(null);
  const [preview, setPreview] = useState(category.attachment ? base64Util(category.attachment) : null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await updateCategory(category.catId, {
        name: name.trim(),
        parentId: parentId ? Number(parentId) : null,
        visible,
      }, attachment);
      if (response) {
        toast.success(t('content_category_updated', 'Category updated'));
        const parentName = categories.find(item => String(item.catId) === String(parentId))?.name;
        onSaved({ ...category, ...response.data, parentName });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form className="admin-form admin-popup-form" onSubmit={submit} noValidate>
      <Field label={t('content_name', 'Name')} htmlFor="category-edit-name"
             error={!name.trim() && t('content_category_name_error', 'Give the category a name')}>
        <Form.Control id="category-edit-name" value={name} isInvalid={!name.trim()}
                      onChange={(event) => setName(event.target.value)}/>
      </Field>
      <Field label={t('content_parent', 'Parent')} htmlFor="category-edit-parent">
        <Form.Select id="category-edit-parent" value={parentId} onChange={(event) => setParentId(event.target.value)}>
          <option value="">{t('content_no_parent_top_level', 'No parent (top level)')}</option>
          {categories?.filter(item => item.catId !== category.catId).map(item =>
            (<option value={item.catId} key={item.catId}>{item.name}</option>))}
        </Form.Select>
      </Field>
      <Field label={t('content_image', 'Image')}
             hint={t('content_image_replace_hint', 'Pick a new image to replace it; otherwise the current one stays.')}>
        <CoverImage preview={preview}
                    onFile={(file) => {
                      setAttachment(file);
                      readPreview(file, setPreview);
                    }}/>
      </Field>
      <Form.Switch id="category-edit-visible" className="admin-switch" label={t('content_visible_to_players', 'Visible to players')}
                   checked={visible} onChange={(event) => setVisible(event.target.checked)}/>
      <div className="popup-actions">
        <button type="button" className="popup-cancel" onClick={onCancel} disabled={saving}>{t('cancel', 'Cancel')}</button>
        <SaveButton saving={saving} className="popup-confirm">{t('content_save_changes', 'Save changes')}</SaveButton>
      </div>
    </Form>
  );
};

const Category = ({
  categories,
  setCategories
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);

  const parent = useRef();
  const visible = useRef();

  const handleName = (event) => setName(event.target.value);
  const categorySearch = useSearch(categories, ['name', 'parentName']);
  const categorySort = useSort(categorySearch.results, {
    name: 'name', parent: 'parentName', visible: 'visible',
    created: (item) => toDate(item.createdDate)?.getTime(),
  });
  const categoryPages = usePagination(categorySort.sorted, PAGE_SIZE,
    `${categorySearch.query}|${categorySort.sort.key}|${categorySort.sort.direction}`);

  // The pencil opens the edit popup for that row.
  const [editing, setEditing] = useState(null);

  // The trash button only opens the popup; its confirm does the delete.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    const category = pendingDelete;
    setDeleting(true);
    deleteCategory(category.catId)
        .then(response => {
          if (!response) return;
          setCategories(categories.filter(item => item.catId !== category.catId));
          toast.success(t('content_category_deleted', 'Category deleted'));
        })
        .finally(() => {
          setDeleting(false);
          setPendingDelete(null);
        });
  };

  const [saving, setSaving] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [touched, setTouched] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await saveCategory({
        name: name.trim(),
        parentId: parent.current.value || null,
        visible: visible.current.checked
      }, avatar);

      if (response) {
        toast.success(t('content_category_saved', 'Category successfully saved'));

        const index = parent.current.selectedIndex;
        const parentName = index > 0 ? parent.current.options[index]?.textContent : undefined;
        setCategories([...categories, {
          ...response.data,
          parentName
        }]);

        setName('');
        parent.current.selectedIndex = 0;
        setAvatar(null);
        setPreviewAvatar(null);
        setTouched(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex justify-content-around">
      <div className={'col-6 shadowed'}>
        <h4 className={'text-center'}>{t('content_categories', 'Categories')}</h4>
        <hr/>
        <TableSearch value={categorySearch.query} onChange={categorySearch.setQuery}
                     placeholder={t('content_category_search_placeholder', 'Search by name or parent…')}
                     count={categorySearch.results.length}
                     label={t('content_search_categories', 'Search categories')}/>
        <Table responsive striped bordered variant="dark">
              <thead>
              <tr>
                <SortHeader column="name" sort={categorySort.sort} onSort={categorySort.toggle} className="col-4">{t('content_name', 'Name')}</SortHeader>
                <SortHeader column="parent" sort={categorySort.sort} onSort={categorySort.toggle} className="col-3">{t('content_parent', 'Parent')}</SortHeader>
                <th className="col-3">{t('content_attachment', 'Attachment')}</th>
                <SortHeader column="created" sort={categorySort.sort} onSort={categorySort.toggle}>{t('content_created', 'Created')}</SortHeader>
                <SortHeader column="visible" sort={categorySort.sort} onSort={categorySort.toggle} className="text-center col-2">{t('content_visible', 'Visible')}</SortHeader>
                <th className="text-center"><span className="visually-hidden">{t('content_actions', 'Actions')}</span></th>
              </tr>
              </thead>
              <tbody>
              {categoryPages.pageItems.map(item => (
                  <tr key={item.catId}>
                    <td>{item.name}</td>
              <td>{item.parentName}</td>
              <td>
                {item.attachment && (
                  <Image
                    rounded
                    width={200}
                    src={base64Util(item.attachment)}
                    fluid
                  />
                )}
              </td>
              <td>{formatDate(item.createdDate, undefined, { dateStyle: 'medium' })}</td>
              <td className="text-center">
                <Form.Switch
                  disabled
                  readOnly
                  checked={Boolean(item.visible)}
                />
              </td>
              <RowActions name={item.name}
                          onEdit={() => setEditing(item)}
                          onDelete={() => setPendingDelete(item)}
                          busy={deleting && pendingDelete?.catId === item.catId}/>
            </tr>
          ))}
            <EmptyRow show={!categorySearch.results.length} columns={6} query={categorySearch.query} what={t('content_empty_categories', 'categories')}/>
          </tbody>
        </Table>
        <Pagination {...categoryPages} onChange={categoryPages.setPage} label={t('content_categories_pages', 'Categories pages')}/>
        {/* Categories still used by questions, glossaries or subcategories are refused by the
            database; the request helper toasts that error and the row stays. */}
        <ConfirmDialog open={Boolean(pendingDelete)}
                       danger
                       busy={deleting}
                       title={t('content_delete_category_title', 'Delete category?')}
                       message={pendingDelete && <>
                         <strong>{pendingDelete.name}</strong> {t('content_delete_category_confirm',
                           'will be permanently deleted. This can’t be undone, and it only works once no questions, glossaries or subcategories use it.')}
                       </>}
                       confirmLabel={t('delete', 'Delete')}
                       onConfirm={confirmDelete}
                       onCancel={() => setPendingDelete(null)}/>
        <Popup open={Boolean(editing)} icon={faPen} title={t('content_edit_category', 'Edit category')} onClose={() => setEditing(null)}>
          {editing && (
            <CategoryEditForm category={editing}
                              categories={categories}
                              onCancel={() => setEditing(null)}
                              onSaved={(updated) => {
                                setCategories(categories.map(item => item.catId === updated.catId ? updated : item));
                                setEditing(null);
                              }}/>
          )}
        </Popup>
      </div>
      <Form className={'col-5 shadowed admin-form'} onSubmit={submit} noValidate>
        <h4>{t('content_new_category', 'New category')}</h4>
        <hr/>

        <Field label={t('content_name', 'Name')} htmlFor="category-name"
               error={touched && !name.trim() && t('content_category_name_error', 'Give the category a name')}>
          <Form.Control id="category-name"
                        value={name}
                        isInvalid={touched && !name.trim()}
                        placeholder={t('content_category_name_placeholder', 'e.g. Geography')}
                        onChange={handleName}/>
        </Field>

        <Field label={t('content_parent', 'Parent')} htmlFor="category-parent"
               hint={t('content_category_parent_hint', 'Leave empty for a top-level category.')}>
          <Form.Select id="category-parent" ref={parent}>
            <option value="">{t('content_no_parent_top_level', 'No parent (top level)')}</option>
            {categories?.map(item =>
              (<option value={item.catId} key={item.catId}>{item.name}</option>)
            )}
          </Form.Select>
        </Field>

        <Field label={t('content_image', 'Image')}
               hint={t('content_category_image_hint', 'Shown on the category card and behind the quiz list.')}>
          <CoverImage preview={previewAvatar}
                      onFile={(file) => {
                        setAvatar(file);
                        readPreview(file, setPreviewAvatar);
                      }}
                      onClear={() => {
                        setAvatar(null);
                        setPreviewAvatar(null);
                      }}/>
        </Field>

        <Form.Switch id="category-visible" className="admin-switch" ref={visible} label={t('content_visible_to_players', 'Visible to players')}/>

        <div className="admin-form-actions">
          <SaveButton saving={saving}>{t('content_save_category', 'Save category')}</SaveButton>
        </div>
      </Form>
    </div>
  );
};

export default Category;
