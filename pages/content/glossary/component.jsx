import React, {useEffect, useState} from 'react';
import saveGlossary from '../../../api/glossary/save';
import Form from 'react-bootstrap/Form';
import { Table } from 'react-bootstrap';
import { toast } from 'react-toastify';
import base64Util from '../../../utils/base64Util';
import {GlossaryEntity} from "../../../domain/glossary-entity";
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faHandPointer, faPen} from '@fortawesome/free-solid-svg-icons';
import {CoverImage, Field, readPreview, SaveButton} from '../../../components/admin/form-kit';
import {Pagination, PAGE_SIZE, usePagination} from '../../../components/admin/pagination';
import {EmptyRow, TableSearch, useSearch} from '../../../components/admin/search';
import {SortHeader, useSort} from '../../../components/admin/sort';
import {formatDate, toDate} from '../../../utils/toDate';
import {RowActions} from '../../../components/admin/row-actions';
import {ConfirmDialog} from '../../../components/common/popup';
import {deleteGlossary} from '../../../api/glossary/manage';

export default function Glossary({
  categories,
  glossaries,
  setGlossaries,
  setGlossaryFilter,
  glossaryTypes
}) {
  const [addType, setAddType] = useState();
  const [addParent, setAddParent] = useState();
  const [addKey, setAddKey] = useState('');
  const [addValue, setAddValue] = useState('');
  const [addOptions, setAddOptions] = useState('');
  const [addAttachment, setAddAttachment] = useState();
  const [addPreview, setAddPreview] = useState(null);
  const [addCategory, setAddCategory] = useState({ catId: 2 });
  const [addIsActive, setAddIsActive] = useState(false);
  const [adding, setAdding] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [addTouched, setAddTouched] = useState(false);

  useEffect(() => {
    if (categories?.length) {
      setAddCategory(categories[0]);
    }
  }, [categories]);

  const [blob, setBlob] = useState(null);
  const [item, setItem] = useState(GlossaryEntity.getDefaultInstance());
  const [editing, setEditing] = useState(false);

  const glossarySearch = useSearch(glossaries, ['key', 'value', 'categoryName', (glossary) => glossary.type?.name]);
  const glossarySort = useSort(glossarySearch.results, {
    key: 'key', value: 'value', category: 'categoryName', type: (glossary) => glossary.type?.name, active: 'isActive',
    created: (glossary) => toDate(glossary.createdDate)?.getTime(),
  });
  const glossaryPages = usePagination(glossarySort.sorted, PAGE_SIZE,
    `${glossarySearch.query}|${glossarySort.sort.key}|${glossarySort.sort.direction}`);
  const handleKey = (event) => setAddKey(event.target.value);
  const handleValue = (event) => setAddValue(event.target.value);
  const handleParent = (event) => setAddParent(event.target.value || undefined);
  const handleActive = (event) => setAddIsActive(event.target.checked);
  const handleCategory = (event) => {
    const category = categories[event.target.value];
    setAddCategory(category);
  };

  const handleType = (event) => {
    const type = glossaryTypes[event.target.value];
    if (type) {
      setAddType({
        id: type.id,
        name: type.name
      });
    } else {
      setAddType(undefined);
    }
  };

  const handleTypeEdit = (event) => {
    const type = glossaryTypes.find(t => String(t.id) === event.target.value) ?? null;
    setItem((values) => ({
      ...values,
      type
    }));
  };

  const addErrors = {
    key: !addKey.trim() && 'Set a key',
    value: !addValue.trim() && 'Set a value',
  };

  const save = async (event) => {
    event.preventDefault();
    setAddTouched(true);
    if (addErrors.key || addErrors.value || !addCategory?.catId) return;

    setAdding(true);
    try {
      const response = await saveGlossary({
        key: addKey,
        type: addType,
        value: addValue,
        options: addOptions.trim() || null,
        // The DTO field is parentId; 'parent' used to be sent and silently ignored.
        parentId: addParent ? Number(addParent) : null,
        isActive: addIsActive,
        categoryId: addCategory.catId
      }, addAttachment);

      if (response) {
        toast.success('Glossary successfully saved');

        setGlossaries(values => [...values, {
          ...response.data,
          categoryName: addCategory.name,
          categoryId: addCategory.catId
        }]);
        setAddKey('');
        setAddValue('');
        setAddOptions('');
        setAddAttachment(undefined);
        setAddPreview(null);
        setAddTouched(false);
      }
    } finally {
      setAdding(false);
    }
  };

  const setItemToEdit = (item) => {
    setItem(item);

    if (item.attachment) {
      setBlob(base64Util(item.attachment));
    } else {
      setBlob(null);
    }
  };

  // Pencil: load the row into the "Edit glossary" panel and move focus there, so it is clear
  // where the editing happens (the panel may be scrolled out of view).
  const editRow = (glossary) => {
    setItemToEdit(glossary);
    requestAnimationFrame(() => {
      const field = document.getElementById('glossary-edit-key');
      field?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      field?.focus({ preventScroll: true });
    });
  };

  // Trash opens the confirm; its button deletes.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    const glossary = pendingDelete;
    setDeleting(true);
    deleteGlossary(glossary.termId)
      .then(response => {
        if (!response) return;
        setGlossaries(values => values.filter(value => value.termId !== glossary.termId));
        // Deleting the term being edited clears the edit panel too.
        if (item.termId === glossary.termId) {
          setItem(GlossaryEntity.getDefaultInstance());
          setBlob(null);
        }
        toast.success('Glossary deleted');
      })
      .finally(() => {
        setDeleting(false);
        setPendingDelete(null);
      });
  };

  const edit = async (event) => {
    event.preventDefault();
    if (!item.key || !item.value) return;

    setEditing(true);
    try {
      const response = await saveGlossary({
        ...item,
        attachment: null
      }, typeof item.attachment === 'string' ? null : item.attachment);

      if (response) {
        toast.success('Glossary successfully saved');

        const index = glossaries.findIndex(item => item.termId === response.data.termId);
        if (index !== -1) {
          glossaries.splice(index, 1, response.data);
          setGlossaries([...glossaries]);
        }
      }
    } finally {
      setEditing(false);
    }
  };

  const handleEditedImage = (file) => {
    setItem((values) => ({
      ...values,
      attachment: file
    }));
    readPreview(file, setBlob);
  };

  const updateItem = (field) => (event) => setItem((values) => ({
    ...values,
    [field]: event.target.value
  }));

  return (<div>
    <div className={'d-flex justify-content-around shadowed'}>
      <div className={'col-6 shadowed'}>
        <h4 className={'text-center'}>Glossaries by</h4>
        <Form.Select aria-label="Category" onChange={(event) => setGlossaryFilter(event.target.value)}>
          {categories?.map(category => (
            <option value={category.catId} key={category.catId}>{category.name}</option>))}
        </Form.Select>
        <hr/>
        <TableSearch value={glossarySearch.query} onChange={glossarySearch.setQuery}
                     placeholder="Search by key, value or type…" count={glossarySearch.results.length}
                     label="Search glossaries"/>
        <Table striped bordered variant="dark">
          <thead>
          <tr>
            <SortHeader column="key" sort={glossarySort.sort} onSort={glossarySort.toggle}>Key</SortHeader>
            <SortHeader column="value" sort={glossarySort.sort} onSort={glossarySort.toggle}>Value</SortHeader>
            <SortHeader column="category" sort={glossarySort.sort} onSort={glossarySort.toggle}>Category</SortHeader>
            <SortHeader column="type" sort={glossarySort.sort} onSort={glossarySort.toggle}>Type</SortHeader>
            <SortHeader column="created" sort={glossarySort.sort} onSort={glossarySort.toggle}>Created</SortHeader>
            <SortHeader column="active" sort={glossarySort.sort} onSort={glossarySort.toggle} className="text-center">Active</SortHeader>
            <th className="text-center"><span className="visually-hidden">Actions</span></th>
          </tr>
          </thead>
          <tbody>
          {glossaryPages.pageItems.map((glossary) => (
            <tr onClick={() => setItemToEdit(glossary)} key={glossary.key + glossary.value}
                role="button" aria-current={glossary.termId === item.termId ? 'true' : undefined}>
              <td>{glossary.key}</td>
              <td>{glossary.value}</td>
              <td>{glossary.categoryName}</td>
              <td>{glossary.type?.name}</td>
              <td>{formatDate(glossary.createdDate, undefined, {dateStyle: 'medium'})}</td>
              <td className="text-center">
                <Form.Switch
                  disabled
                  readOnly
                  checked={Boolean(glossary.isActive)}
                /></td>
              <RowActions name={glossary.value || glossary.key}
                          onEdit={() => editRow(glossary)}
                          onDelete={() => setPendingDelete(glossary)}
                          busy={deleting && pendingDelete?.termId === glossary.termId}/>
            </tr>))}
            <EmptyRow show={!glossarySearch.results.length} columns={7} query={glossarySearch.query} what="glossaries"/>
          </tbody>
        </Table>
        <Pagination {...glossaryPages} onChange={glossaryPages.setPage} label="Glossaries pages"/>

        {/* A term still used as an answer, or with terms under it, is refused by the server
            with a message saying which. */}
        <ConfirmDialog open={Boolean(pendingDelete)}
                       danger
                       busy={deleting}
                       title="Delete glossary?"
                       message={pendingDelete && <>
                         <strong>{pendingDelete.value || pendingDelete.key}</strong> and its translations will be
                         permanently deleted. It only works once no questions or other glossaries use it.
                       </>}
                       confirmLabel="Delete"
                       onConfirm={confirmDelete}
                       onCancel={() => setPendingDelete(null)}/>
      </div>
      <div className={'col-5 d-flex flex-column gap-4'}>
        <Form className={'shadowed admin-form'} onSubmit={save} noValidate>
          <h4>New glossary</h4>
          <hr/>

          <div className="admin-form-grid">
            <Field label="Key" htmlFor="glossary-key" error={addTouched && addErrors.key}>
              <Form.Control id="glossary-key"
                            value={addKey}
                            isInvalid={addTouched && Boolean(addErrors.key)}
                            placeholder="Key"
                            onChange={handleKey}/>
            </Field>

            <Field label="Value" htmlFor="glossary-value" error={addTouched && addErrors.value}>
              <Form.Control id="glossary-value"
                            value={addValue}
                            isInvalid={addTouched && Boolean(addErrors.value)}
                            placeholder="Value"
                            onChange={handleValue}/>
            </Field>

            <Field label="Value type" htmlFor="glossary-type">
              <Form.Select id="glossary-type" onChange={handleType}>
                <option value="">None</option>
                {glossaryTypes?.map((type, index) => (
                  <option value={index} key={type.name}>{type.name}</option>))}
              </Form.Select>
            </Field>

            <Field label="Category" htmlFor="glossary-category">
              <Form.Select id="glossary-category" onChange={handleCategory}>
                {categories?.map((category, index) => (
                  <option value={index} key={category.catId}>{category.name}</option>))}
              </Form.Select>
            </Field>

            {/* Map quizzes: a city term keeps its coordinates here; countries and continents are
                placed by their key (ISO code, continent code) instead. */}
            <Field label="Options" htmlFor="glossary-options" wide>
              <Form.Control id="glossary-options"
                            value={addOptions}
                            placeholder="e.g. 47.01,28.86 (a city's lat,lng for map quizzes)"
                            onChange={(event) => setAddOptions(event.target.value)}/>
            </Field>

            <Field label="Parent" htmlFor="glossary-parent" wide>
              <Form.Select id="glossary-parent" onChange={handleParent}>
                <option value="">No parent</option>
                {glossaries?.map(glossary => (<option value={glossary.termId}
                                                      key={glossary.termId}>{glossary.value}</option>))}
              </Form.Select>
            </Field>

            <Field label="Attachment" wide>
              <CoverImage preview={addPreview}
                          onFile={(file) => {
                            setAddAttachment(file);
                            readPreview(file, setAddPreview);
                          }}
                          onClear={() => {
                            setAddAttachment(undefined);
                            setAddPreview(null);
                          }}/>
            </Field>
          </div>

          <Form.Switch id="glossary-active" className="admin-switch" label="Active"
                       checked={addIsActive} onChange={handleActive}/>

          <div className="admin-form-actions">
            <SaveButton saving={adding}>Save glossary</SaveButton>
          </div>
        </Form>

        <Form className={'shadowed admin-form'} onSubmit={edit} noValidate>
          <h4>Edit glossary</h4>
          <hr/>

          {!item.termId ? (
            // Nothing picked yet: say how to start instead of showing an empty form.
            <p className="admin-form-empty">
              <FontAwesomeIcon icon={faHandPointer}/> Pick a row in the table to edit it.
            </p>
          ) : (
            <>
              <div className="admin-form-grid">
                <Field label="Key" htmlFor="glossary-edit-key" error={!item.key && 'Set a key'}>
                  <Form.Control id="glossary-edit-key"
                                value={item.key}
                                isInvalid={!item.key}
                                placeholder="Key"
                                onChange={updateItem('key')}/>
                </Field>

                <Field label="Value" htmlFor="glossary-edit-value" error={!item.value && 'Set a value'}>
                  <Form.Control id="glossary-edit-value"
                                value={item.value}
                                isInvalid={!item.value}
                                placeholder="Value"
                                onChange={updateItem('value')}/>
                </Field>

                <Field label="Category" htmlFor="glossary-edit-category">
                  <Form.Select id="glossary-edit-category" value={item.categoryId} onChange={updateItem('categoryId')}>
                    {categories?.map(category => (
                      <option value={category.catId} key={category.catId}>{category.name}</option>))}
                  </Form.Select>
                </Field>

                <Field label="Type" htmlFor="glossary-edit-type">
                  <Form.Select id="glossary-edit-type" value={item.type?.id ?? ''} onChange={handleTypeEdit}>
                    <option value="">None</option>
                    {glossaryTypes?.map(type => (
                      <option value={type.id} key={type.id}>{type.name}</option>))}
                  </Form.Select>
                </Field>

                <Field label="Options" htmlFor="glossary-edit-options" wide>
                  <Form.Control id="glossary-edit-options"
                                value={item.options ?? ''}
                                placeholder="e.g. 47.01,28.86 (a city's lat,lng for map quizzes)"
                                onChange={updateItem('options')}/>
                </Field>

                <Field label="Parent" htmlFor="glossary-edit-parent" wide>
                  <Form.Select id="glossary-edit-parent" value={item.parentId ?? ''}
                               onChange={(event) => setItem((values) => ({
                                 ...values,
                                 parentId: event.target.value ? Number(event.target.value) : null
                               }))}>
                    <option value="">No parent</option>
                    {glossaries?.map(glossary => (
                      <option value={glossary.termId} key={glossary.termId}>{glossary.value}</option>))}
                  </Form.Select>
                </Field>

                <Field label="Attachment" wide>
                  <CoverImage preview={blob} onFile={handleEditedImage}/>
                </Field>
              </div>

              <Form.Switch id="glossary-edit-active" className="admin-switch" label="Active"
                           checked={Boolean(item.isActive)}
                           onChange={(event) => setItem((values) => ({
                             ...values,
                             isActive: event.target.checked
                           }))}/>

              <div className="admin-form-actions">
                <SaveButton saving={editing} icon={faPen}>Save changes</SaveButton>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  </div>);
}
