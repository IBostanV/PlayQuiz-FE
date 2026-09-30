import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

export const PAGE_SIZE = 10;

// Page buttons to show (1-based), with 'gap' where pages are skipped: always the first and
// last page and the current one with a neighbour either side. 1 … 4 5 6 … 12
export const pageList = (page, pageCount) => {
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter(number => number >= 1 && number <= pageCount).sort((a, b) => a - b);

  return sorted.flatMap((number, index) =>
    index > 0 && number - sorted[index - 1] > 1 ? ['gap', number] : [number]);
};

// Client-side paging for lists already loaded in full. When the list shrinks (a delete, a
// different filter) the page is pulled back so it is never past the end; when `resetKey`
// changes (a new search) it goes back to page 1.
export const usePagination = (items, pageSize = PAGE_SIZE, resetKey = undefined) => {
  const [page, setPage] = useState(1);
  const total = items?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const current = Math.min(page, pageCount);
  const pageItems = (items ?? []).slice((current - 1) * pageSize, current * pageSize);

  return { page: current, setPage, pageCount, pageItems, total, pageSize };
};

// "Showing 11–20 of 57" on the left, the page buttons on the right. Renders nothing when
// everything fits on one page.
export const Pagination = ({ page, pageCount, total, pageSize = PAGE_SIZE, onChange, label = 'Pagination' }) => {
  if (pageCount <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="admin-pagination" aria-label={label}>
      <span className="admin-pagination-range">
        {from}–{to} of {total}
      </span>
      <div className="admin-pagination-pages">
        <button type="button" className="admin-page-button" onClick={() => onChange(page - 1)}
                disabled={page === 1} aria-label="Previous page" data-tooltip="Previous page">
          <FontAwesomeIcon icon={faChevronLeft}/>
        </button>
        {pageList(page, pageCount).map((number, index) => number === 'gap'
          ? <span key={`gap-${index}`} className="admin-page-gap" aria-hidden>…</span>
          : (
            <button key={number} type="button" className="admin-page-button"
                    onClick={() => onChange(number)}
                    aria-label={`Page ${number}`}
                    aria-current={number === page ? 'page' : undefined}>
              {number}
            </button>
          ))}
        <button type="button" className="admin-page-button" onClick={() => onChange(page + 1)}
                disabled={page === pageCount} aria-label="Next page" data-tooltip="Next page">
          <FontAwesomeIcon icon={faChevronRight}/>
        </button>
      </div>
    </nav>
  );
};

Pagination.propTypes = {
  page: PropTypes.number,
  pageCount: PropTypes.number,
  total: PropTypes.number,
  pageSize: PropTypes.number,
  onChange: PropTypes.func,
  label: PropTypes.string,
};
