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
    lastSearchTerm: '', // Track the last search term
    currentPlaylistId: null, // Track current playlist ID
    waveformProgress: 0, // Current progress percentage (0-100)
    audioPosition: 0, // Current audio position in seconds
    waveformDimensions: { // Store dimensions for calculations
        width: 0,
        height: 0
    },
    pendingSeekPosition: undefined // Store pending seek position for new tracks
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

export function setCurrentPlaylistId(id) {
    updateState({ currentPlaylistId: id });
}

// Waveform state management functions
export function setWaveformProgress(progress) {
    updateState({ waveformProgress: Math.max(0, Math.min(100, progress)) });
}

export function setAudioPosition(position) {
    updateState({ audioPosition: Math.max(0, position) });
}

export function setWaveformDimensions(dimensions) {
    updateState({
        waveformDimensions: {
            width: Math.max(0, dimensions.width),
            height: Math.max(0, dimensions.height)
        }
    });
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
        lastSearchTerm: '',
        currentPlaylistId: null
    });
}