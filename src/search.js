// src/search.js
import { performSearchRequest, _testing } from './api.js';
import { resultsDiv, searchBox, dropdownColumn, dropdownInput } from './elements.js';
import { renderResults } from './render.js';
import { getState, setTotalRecords, setLoading, setError, updateState } from './state.js';
import { updatePaginationInfo } from './utils.js';

export async function performSearch(fromPagination = false) {
    console.log('Performing search...');
    const state = getState();
    console.log('Current state:', state);
    
    // Get all search values upfront
    const searchTerm = fromPagination ? state.lastSearchTerm : searchBox.value.trim();
    const dropdownColumnValue = dropdownColumn.value;
    const dropdownInputValue = dropdownInput.value.trim();
    const filter = state.activeFilter;
    
    console.log('Search configuration:', {
        mainSearch: {
            term: searchTerm,
            terms: searchTerm ? searchTerm.split(/\s+/).filter(Boolean) : []
        },
        dropdown: {
            column: dropdownColumnValue,
            value: dropdownInputValue
        },
        filter,
        fromPagination
    });
    
    // Update lastSearchTerm in state if not from pagination
    if (!fromPagination) {
        // Clear the API cache when performing a new search
        _testing.clearCache();
        
        updateState({
            lastSearchTerm: searchTerm,
            currentPage: 1 // Reset to first page for new searches
        });
    }
    
    // Only update initialLoad if not from pagination and there's a search term or dropdown value
    if ((searchTerm || dropdownInputValue) && !fromPagination) {
        updateState({ initialLoad: false });
    }
    
    // Don't perform search on initial load or when no search criteria
    if ((state.initialLoad && !fromPagination) ||
        (!searchTerm && !dropdownInputValue)) {
        console.log('Initial load or no search criteria, showing default message');
        resultsDiv.innerHTML = '<p>Please perform a search.</p>';
        updateState({ totalRecords: 0 });
        return;
    }

    // Don't perform search if only dropdown column is selected without a value
    if (!searchTerm && dropdownColumnValue && !dropdownInputValue) {
        console.log('Dropdown column selected but no value entered');
        return;
    }

    // Show loading state
    setLoading(true);
    setError(null);
    resultsDiv.innerHTML = '<p>Loading...</p>';

    console.log('Search parameters:', {
        searchTerm,
        filter,
        dropdownColumn: {
            element: dropdownColumn,
            value: dropdownColumnValue,
            rawValue: dropdownColumn.value
        },
        dropdownInput: {
            element: dropdownInput,
            value: dropdownInputValue,
            rawValue: dropdownInput.value
        },
        currentPage: state.currentPage,
        recordsPerPage: state.recordsPerPage,
        fromPagination
    });

    try {
        console.log('Making API request...');
        const data = await performSearchRequest(
            searchTerm,
            filter,
            dropdownColumnValue,
            dropdownInputValue,
            state.currentPage,
            state.recordsPerPage
        );
        console.log('Search results:', data);

        // First update the total records in state
        setTotalRecords(data.total);
        console.log('Updated total records:', data.total);

        // Then update the UI
        renderResults(data.results);
        updatePaginationInfo(data.total, state.currentPage);

        // If we got results, ensure initialLoad is false
        if (data.total > 0) {
            updateState({ 
                initialLoad: false,
                totalRecords: data.total // Ensure totalRecords is set in state
            });
        } else {
            updateState({ totalRecords: 0 });
        }

    } catch (error) {
        console.error('Error searching tracks:', error);
        setError({
            message: 'Error searching tracks',
            details: error.message
        });
        resultsDiv.innerHTML = `
            <div class="error-message">
                <p>Error searching tracks.</p>
                <p class="error-details">${error.message}</p>
                <button onclick="window.location.reload()">Retry</button>
            </div>`;
        updateState({ totalRecords: 0 });
    } finally {
        setLoading(false);
    }
}

// Subscribe to state changes to update UI accordingly
import { subscribe } from './state.js';

subscribe((state) => {
    console.log('State updated in search.js:', state);
    // Update loading state
    if (state.isLoading) {
        resultsDiv.classList.add('loading');
    } else {
        resultsDiv.classList.remove('loading');
    }

    // Update error state
    if (state.error) {
        resultsDiv.classList.add('error');
    } else {
        resultsDiv.classList.remove('error');
    }

    // Log total records whenever state changes
    console.log('Current total records:', state.totalRecords);
});