import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons';

// Case-insensitive "contains" over the given fields. Each field is a key or a function of the
// item, so nested values (glossary.type.name) work too.
export const matches = (item, fields, query) => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return fields.some(field => {
    const value = typeof field === 'function' ? field(item) : item?.[field];
    return value != null && String(value).toLowerCase().includes(needle);
  });
};

// Filters a list already loaded in full. Returns the filtered items plus the query state.
export const useSearch = (items, fields) => {
  const [query, setQuery] = useState('');
  const results = useMemo(
    () => (items ?? []).filter(item => matches(item, fields, query)),
    // `fields` is a literal at every call site; the items and query are what change.
    [items, query]
  );
  return { query, setQuery, results };
};

// Search box that sits above an admin table: magnifier, clear button, and while searching,
// how many rows matched.
export const TableSearch = ({ value, onChange, placeholder = 'Search…', count, label = 'Search' }) => (
  <div className="admin-search">
    <label className="admin-search-box">
      <FontAwesomeIcon icon={faMagnifyingGlass} className="admin-search-icon"/>
      <input type="search"
             value={value}
             onChange={(event) => onChange(event.target.value)}
             onKeyDown={(event) => event.key === 'Escape' && onChange('')}
             placeholder={placeholder}
             aria-label={label}/>
      {value && (
        <button type="button" className="admin-search-clear" onClick={() => onChange('')}
                aria-label="Clear search" data-tooltip="Clear search">
          <FontAwesomeIcon icon={faXmark}/>
        </button>
      )}
    </label>
    {value && count != null && (
      <span className="admin-search-count" aria-live="polite">
        {count} {count === 1 ? 'match' : 'matches'}
      </span>
    )}
  </div>
);

// Full-width row for a table with nothing to show: no match for the search, or no data yet.
export const EmptyRow = ({ show, columns, query, what }) => show ? (
  <tr className="admin-empty-row">
    <td colSpan={columns}>
      {query ? <>No {what} match “{query}”.</> : <>No {what} yet.</>}
    </td>
  </tr>
) : null;

EmptyRow.propTypes = {
  show: PropTypes.bool,
  columns: PropTypes.number,
  query: PropTypes.string,
  what: PropTypes.string,
};

TableSearch.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  count: PropTypes.number,
  label: PropTypes.string,
};
