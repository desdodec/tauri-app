// utils.js
import { pageInfoSpan } from './elements.js';
import { currentPage, recordsPerPage, totalRecords } from './state.js';

export function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function updatePaginationInfo() {
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
}