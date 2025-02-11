// api.js
const API_BASE_URL = 'http://localhost:3000';

export async function performSearchRequest(searchTerm, filter, dropdownColumnValue, dropdownInputValue, currentPage, recordsPerPage) {
    let url = `${API_BASE_URL}/search?term=${encodeURIComponent(searchTerm)}&page=${currentPage}&limit=${recordsPerPage}`;

    if (filter !== 'all') {
        url += `&filter=${filter}`;
    }

    if (dropdownInputValue) {
        url += `&dropdownColumn=${encodeURIComponent(dropdownColumnValue)}&dropdownValue=${encodeURIComponent(dropdownInputValue)}`;
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error searching tracks:', error);
        throw error;
    }
}

export async function loadPlaylistsRequest() {
    try {
        const response = await fetch(`${API_BASE_URL}/playlists`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading playlists:', error);
        throw error;
    }
}

export async function deletePlaylistRequest(playlistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlists/${playlistId}`, { method: 'DELETE' });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return;
    } catch (error) {
        console.error('Error deleting playlist:', error);
        throw error;
    }
}

export async function createPlaylistRequest(playlistName) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlists`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: playlistName })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error creating playlist:', error);
        throw error;
    }
}

export async function loadPlaylistTracksRequest(playlistId) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlist-tracks/${playlistId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error loading playlist tracks:', error);
        throw error;
    }
}

export async function removeTrackFromPlaylistRequest(playlistTrackId) {
    try {
        const response = await fetch(`${API_BASE_URL}/playlist-tracks/${playlistTrackId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return;
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        throw error;
    }
}