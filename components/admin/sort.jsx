import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSort, faSortDown, faSortUp } from '@fortawesome/free-solid-svg-icons';

// Orders mixed values the way a reader expects: numbers numerically, text by locale with
// "Level 2" before "Level 10", booleans false then true, and empty values always last.
export const compareValues = (a, b) => {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
};

// Sorts a list already loaded in full. `columns` maps a column key to a field name or a
// function of the item. First click on a column sorts ascending, the next one descending.
export const useSort = (items, columns, initial = { key: null, direction: 'asc' }) => {
  const [sort, setSort] = useState(initial);

  const sorted = useMemo(() => {
    const column = sort.key && columns[sort.key];
    if (!column) return items ?? [];
    const value = (item) => typeof column === 'function' ? column(item) : item?.[column];
    const sign = sort.direction === 'desc' ? -1 : 1;
    // Empty values stay last in both directions, so only the non-empty part is flipped.
    return [...(items ?? [])].sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      const emptyA = va == null || va === '';
      const emptyB = vb == null || vb === '';
      if (emptyA || emptyB) return compareValues(va, vb);
      return sign * compareValues(va, vb);
    });
    // `columns` is a literal at every call site; the items and sort are what change.
  }, [items, sort]);

  const toggle = (key) => setSort(current => ({
    key,
    direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  }));

  return { sort, setSort, toggle, sorted };
};

// A header cell that sorts its column. The whole label is the button, and aria-sort tells
// screen readers which way the column is ordered.
export const SortHeader = ({ column, sort, onSort, children, className }) => {
  const active = sort.key === column;
  const direction = active ? sort.direction : null;

  return (
    <th className={className} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="admin-sort" data-active={active} onClick={() => onSort(column)}>
        {children}
        <FontAwesomeIcon icon={!active ? faSort : direction === 'asc' ? faSortUp : faSortDown}
                         className="admin-sort-icon"/>
      </button>
    </th>
  );
};

SortHeader.propTypes = {
  column: PropTypes.string,
  sort: PropTypes.shape({ key: PropTypes.string, direction: PropTypes.string }),
  onSort: PropTypes.func,
  children: PropTypes.node,
  className: PropTypes.string,
};
