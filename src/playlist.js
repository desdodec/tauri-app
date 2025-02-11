// playlist.js
import { loadPlaylistsRequest } from './api.js';
import { playlistsDiv } from './elements.js';
import { renderPlaylists } from './render.js';

// Load playlists on page load
loadPlaylists();

async function loadPlaylists() {
    try {
        const playlists = await loadPlaylistsRequest();
        renderPlaylists(playlists);
    } catch (error) {
        console.error('Error loading playlists:', error);
        alert('Failed to load playlists');
    }
}

// Implement your createPlaylist, deletePlaylist, etc. functions here (using api.js to make API calls).