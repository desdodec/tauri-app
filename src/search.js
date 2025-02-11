// search.js
import { performSearchRequest } from './api.js';
import { resultsDiv, searchBox, dropdownColumn, dropdownInput } from './elements.js';
import { renderResults } from './render.js';
import { currentPage, initialLoad, totalRecords, recordsPerPage, activeFilter } from './state.js';
import { updatePaginationInfo } from './utils.js';

export async function performSearch() {
    if (initialLoad) {
        resultsDiv.innerHTML = '<p>Please perform a search.</p>';
        initialLoad = false;
        return;
    }

    const searchTerm = searchBox.value.trim();
    const filter = activeFilter;
    const dropdownColumnValue = dropdownColumn.value.trim();
    const dropdownInputValue = dropdownInput.value.trim();

    try {
        const data = await performSearchRequest(searchTerm, filter, dropdownColumnValue, dropdownInputValue, currentPage, recordsPerPage);

        const results = data.results;
        totalRecords = data.total;
        renderResults(results);
        updatePaginationInfo();

    } catch (error) {
        console.error('Error searching tracks:', error);
        resultsDiv.innerHTML = '<p>Error searching tracks.</p>';
    }
}