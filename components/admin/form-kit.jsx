import React, { useState } from 'react';
import PropTypes from 'prop-types';
import Form from 'react-bootstrap/Form';
import { Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFloppyDisk, faImage, faXmark } from '@fortawesome/free-solid-svg-icons';
import { shrinkToCover } from '../../utils/shrinkImage';

// Shared pieces for the admin forms, so every section looks and behaves the same:
// label over control, errors only after a save attempt, one kind of image picker and save button.

// Label, control, then either the error (once shown) or a hint.
export const Field = ({ label, htmlFor, error, hint, wide = false, children }) => (
  <Form.Group className="admin-field" data-wide={wide}>
    {label && <Form.Label htmlFor={htmlFor}>{label}</Form.Label>}
    {children}
    {error
      ? <div className="invalid-feedback d-block">{error}</div>
      : hint && <Form.Text className="admin-field-hint">{hint}</Form.Text>}
  </Form.Group>
);

// Image picker: the whole zone is the file input, and an image can be dropped on it.
// Every picked image is scaled down first (shrinkToCover), so the forms only ever see the small one.
export const CoverImage = ({ preview, onFile, onClear, label = 'Drop an image or click to choose' }) => {
  const [dragging, setDragging] = useState(false);
  const pick = (file) => shrinkToCover(file).then(onFile);

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) pick(file);
  };

  return (
    <div className="kb-cover">
      <label className="kb-cover-zone"
             data-dragging={dragging}
             onDragOver={(event) => {
               event.preventDefault();
               setDragging(true);
             }}
             onDragLeave={() => setDragging(false)}
             onDrop={onDrop}>
        {preview
          ? <img src={preview} alt=""/>
          : (
            <span className="kb-cover-empty">
              <FontAwesomeIcon icon={faImage}/>
              <span>{label}</span>
            </span>
          )}
        <input type="file" accept="image/*" className="visually-hidden"
               onChange={(event) => event.target.files?.[0] && pick(event.target.files[0])}/>
      </label>
      {preview && onClear && (
        <button type="button" className="kb-cover-remove" onClick={onClear} data-tooltip="Remove image">
          <FontAwesomeIcon icon={faXmark}/>
          <span className="visually-hidden">Remove image</span>
        </button>
      )}
    </div>
  );
};

// Reads a picked file into a data URL for the preview.
export const readPreview = (file, setPreview) => {
  const reader = new FileReader();
  reader.onloadend = () => setPreview(reader.result);
  reader.readAsDataURL(file);
};

export const SaveButton = ({ saving, icon = faFloppyDisk, children, ...props }) => (
  <Button type="submit" variant="primary" disabled={saving} {...props}>
    {saving ? <span className="auth-spinner" aria-hidden/> : <FontAwesomeIcon icon={icon}/>}
    {children}
  </Button>
);

Field.propTypes = {
  label: PropTypes.node,
  htmlFor: PropTypes.string,
  error: PropTypes.node,
  hint: PropTypes.node,
  wide: PropTypes.bool,
  children: PropTypes.node,
};

CoverImage.propTypes = {
  preview: PropTypes.string,
  onFile: PropTypes.func,
  onClear: PropTypes.func,
  label: PropTypes.string,
};

SaveButton.propTypes = {
  saving: PropTypes.bool,
  icon: PropTypes.object,
  children: PropTypes.node,
};
