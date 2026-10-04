import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Table } from 'react-bootstrap';
import saveGlossaryType from '../../../api/glossary/save-type';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Field, SaveButton } from '../../../components/admin/form-kit';
import { Pagination, PAGE_SIZE, usePagination } from '../../../components/admin/pagination';
import { EmptyRow, TableSearch, useSearch } from '../../../components/admin/search';
import { SortHeader, useSort } from '../../../components/admin/sort';
import { RowActions } from '../../../components/admin/row-actions';
import { ConfirmDialog, Popup } from '../../../components/common/popup';
import { deleteGlossaryType, updateGlossaryType } from '../../../api/glossary/manage';
import { faPen } from '@fortawesome/free-solid-svg-icons';

const GlossaryTypeEditForm = ({ type, onCancel, onSaved }) => {
  const { t } = useTranslation();
  const [name, setName] = useState(type.name ?? '');
  const [options, setOptions] = useState(type.options ?? '');
  const [isActive, setIsActive] = useState(Boolean(type.isActive));
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await updateGlossaryType(type.id, { name: name.trim(), options, isActive });
      if (response) {
        toast.success(t('content_glossary_type_updated', 'Glossary type updated'));
        onSaved({ ...type, ...response.data });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Form className="admin-form admin-popup-form" onSubmit={submit} noValidate>
      <Field label={t('content_name', 'Name')} htmlFor="glossary-type-edit-name"
             error={!name.trim() && t('content_glossary_type_name_error', 'Give the type a name')}>
        <Form.Control id="glossary-type-edit-name" value={name} isInvalid={!name.trim()}
                      onChange={(event) => setName(event.target.value)}/>
      </Field>
      <Field label={t('content_options', 'Options')} htmlFor="glossary-type-edit-options"
             hint={t('content_glossary_type_options_hint', 'Optional. map:country, map:continent or map:city turns its terms into map answers.')}>
        <Form.Control id="glossary-type-edit-options" value={options}
                      onChange={(event) => setOptions(event.target.value)}/>
      </Field>
      <Form.Switch id="glossary-type-edit-active" className="admin-switch" label={t('content_active', 'Active')}
                   checked={isActive} onChange={(event) => setIsActive(event.target.checked)}/>
      <div className="popup-actions">
        <button type="button" className="popup-cancel" onClick={onCancel} disabled={saving}>{t('cancel', 'Cancel')}</button>
        <SaveButton saving={saving} className="popup-confirm">{t('content_save_changes', 'Save changes')}</SaveButton>
      </div>
    </Form>
  );
};

function GlossaryType({
  glossaryTypes,
  setGlossaryTypes
}) {
  const { t } = useTranslation();
  const [options, setOptions] = useState('');
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  // Errors show after the first save attempt, not on a fresh, empty form.
  const [touched, setTouched] = useState(false);

  const handleName = (event) => setName(event.target.value);
  const typeSearch = useSearch(glossaryTypes, ['name', 'options']);
  const typeSort = useSort(typeSearch.results, { name: 'name', options: 'options', active: 'isActive' });
  const typePages = usePagination(typeSort.sorted, PAGE_SIZE,
    `${typeSearch.query}|${typeSort.sort.key}|${typeSort.sort.direction}`);
  const handleOptions = (event) => setOptions(event.target.value);
  const handleIsActive = (event) => setIsActive(event.target.checked);

  // Pencil opens the edit popup; trash opens the confirm, whose button deletes.
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    const type = pendingDelete;
    setDeleting(true);
    deleteGlossaryType(type.id)
      .then(response => {
        if (!response) return;
        setGlossaryTypes(glossaryTypes.filter(item => item.id !== type.id));
        toast.success(t('content_glossary_type_deleted', 'Glossary type deleted'));
      })
      .finally(() => {
        setDeleting(false);
        setPendingDelete(null);
      });
  };

  const save = async (event) => {
    event.preventDefault();
    setTouched(true);
    if (!name.trim()) return;

    setSaving(true);
    try {
      const response = await saveGlossaryType({
        name: name.trim(),
        options,
        isActive
      });
      if (response) {
        toast.success(t('content_glossary_type_saved', 'Glossary type successfully saved'));

        setName('');
        setOptions('');
        setTouched(false);
        setGlossaryTypes([...glossaryTypes, response.data]);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={'d-flex justify-content-around'}>
      <div className={'col-6 shadowed'}>
        <h4 className={'text-center'}>{t('content_glossary_types', 'Glossary types')}</h4>
        <hr/>
        <TableSearch value={typeSearch.query} onChange={typeSearch.setQuery}
                     placeholder={t('content_glossary_type_search_placeholder', 'Search by name or options…')}
                     count={typeSearch.results.length}
                     label={t('content_search_glossary_types', 'Search glossary types')}/>
        <Table responsive striped bordered variant="dark">
          <thead>
          <tr>
            <SortHeader column="name" sort={typeSort.sort} onSort={typeSort.toggle}>{t('content_name', 'Name')}</SortHeader>
            <SortHeader column="options" sort={typeSort.sort} onSort={typeSort.toggle}>{t('content_options', 'Options')}</SortHeader>
            <SortHeader column="active" sort={typeSort.sort} onSort={typeSort.toggle} className="text-center">{t('content_active', 'Active')}</SortHeader>
            <th className="text-center"><span className="visually-hidden">{t('content_actions', 'Actions')}</span></th>
          </tr>
          </thead>
          <tbody>
          {typePages.pageItems.map(item => (
            <tr key={item.id ?? item.name}>
              <td>{item.name}</td>
              <td>{item.options}</td>
              <td className="text-center">
                {/* Each type's own flag (this used to show the form's switch for every row). */}
                <Form.Switch
                  disabled
                  checked={Boolean(item.isActive)}
                  readOnly
                />
              </td>
              <RowActions name={item.name}
                          onEdit={() => setEditing(item)}
                          onDelete={() => setPendingDelete(item)}
                          busy={deleting && pendingDelete?.id === item.id}/>
            </tr>
          ))}
            <EmptyRow show={!typeSearch.results.length} columns={4} query={typeSearch.query} what={t('content_empty_glossary_types', 'glossary types')}/>
          </tbody>
        </Table>
        <Pagination {...typePages} onChange={typePages.setPage} label={t('content_glossary_types_pages', 'Glossary types pages')}/>

        {/* A type still used by glossaries is refused by the server with a message saying so. */}
        <ConfirmDialog open={Boolean(pendingDelete)}
                       danger
                       busy={deleting}
                       title={t('content_delete_glossary_type_title', 'Delete glossary type?')}
                       message={pendingDelete && <>
                         <strong>{pendingDelete.name}</strong> {t('content_delete_glossary_type_confirm',
                           'will be permanently deleted. It only works once no glossaries use this type.')}
                       </>}
                       confirmLabel={t('delete', 'Delete')}
                       onConfirm={confirmDelete}
                       onCancel={() => setPendingDelete(null)}/>
        <Popup open={Boolean(editing)} icon={faPen} title={t('content_edit_glossary_type', 'Edit glossary type')} onClose={() => setEditing(null)}>
          {editing && (
            <GlossaryTypeEditForm type={editing}
                                  onCancel={() => setEditing(null)}
                                  onSaved={(updated) => {
                                    setGlossaryTypes(glossaryTypes.map(item => item.id === updated.id ? updated : item));
                                    setEditing(null);
                                  }}/>
          )}
        </Popup>
      </div>
      <Form className={'col-5 shadowed admin-form'} onSubmit={save} noValidate>
        <h4>{t('content_new_glossary_type', 'New glossary type')}</h4>
        <hr/>

        <Field label={t('content_name', 'Name')} htmlFor="glossary-type-name"
               error={touched && !name.trim() && t('content_glossary_type_name_error', 'Give the type a name')}>
          <Form.Control id="glossary-type-name"
                        value={name}
                        isInvalid={touched && !name.trim()}
                        placeholder={t('content_glossary_type_name_placeholder', 'e.g. Capital city')}
                        onChange={handleName}/>
        </Field>

        <Field label={t('content_options', 'Options')} htmlFor="glossary-type-options"
               hint={t('content_glossary_type_options_hint', 'Optional. map:country, map:continent or map:city turns its terms into map answers.')}>
          <Form.Control id="glossary-type-options"
                        value={options}
                        placeholder={t('content_options', 'Options')}
                        onChange={handleOptions}/>
        </Field>

        <Form.Switch id="glossary-type-active" className="admin-switch" label={t('content_active', 'Active')}
                     checked={isActive} onChange={handleIsActive}/>

        <div className="admin-form-actions">
          <SaveButton saving={saving}>{t('content_save_type', 'Save type')}</SaveButton>
        </div>
      </Form>
    </div>
  );
}

export default GlossaryType;
