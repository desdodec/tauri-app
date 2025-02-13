// src/state.js

const state = {
    currentPage: 1,
    recordsPerPage: 10,
    totalRecords: 0,
    activeFilter: 'all',
    initialLoad: false,
    sound: null,
    currentTrackId: null,
    albumCover: null,
    isLoading: false,
    error: null,
    lastSearchTerm: '' // Add this to track the last search term
};

const listeners = new Set();

export function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getState() {
    return { ...state };
}

export function updateState(updates) {
    Object.assign(state, updates);
    listeners.forEach(listener => listener(getState()));
}

// Specific state update functions to maintain controlled updates
export function setCurrentPage(page) {
    // Don't reset initialLoad when changing pages
    updateState({ 
        currentPage: page,
        error: null // Clear any previous errors
    });
}

export function setTotalRecords(total) {
    updateState({ totalRecords: total });
}

export function setActiveFilter(filter) {
    updateState({ 
        activeFilter: filter,
        error: null // Clear any previous errors
    });
}

export function setSound(soundInstance) {
    updateState({ sound: soundInstance });
}

export function setAlbumCover(cover) {
    updateState({ albumCover: cover });
}

export function setLoading(isLoading) {
    updateState({ isLoading });
}

export function setError(error) {
    updateState({ error });
}

// Reset search state
export function resetSearchState() {
    updateState({
        currentPage: 1,
        totalRecords: 0,
        activeFilter: 'all',
        initialLoad: true,
        error: null,
        lastSearchTerm: '',
        isLoading: false
    });
}

// Initialize state
export function initializeState() {
    updateState({
        currentPage: 1,
        recordsPerPage: 10,
        totalRecords: 0,
        activeFilter: 'all',
        initialLoad: true,
        sound: null,
        currentTrackId: null,
        albumCover: null,
        isLoading: false,
        error: null,
        lastSearchTerm: ''
    });
}