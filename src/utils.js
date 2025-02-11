// utils.js
import { pageInfoSpan } from './elements.js';
import { recordsPerPage } from './state.js'; // Import recordsPerPage

export function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function updatePaginationInfo(totalRecords, currentPage) { // updatePaginationInfo now takes totalRecords and currentPage
    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
}