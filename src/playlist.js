// playlist.js
import { loadPlaylistsRequest, deletePlaylistRequest, createPlaylistRequest, loadPlaylistTracksRequest, removeTrackFromPlaylistRequest } from './api.js';
import { playlistsDiv, playlistNameInput } from './elements.js';
import { renderPlaylists, renderResults } from './render.js';
//import { loadPlaylistTracks } from './events.js'; // REMOVE THIS DUPLICATE IMPORT - Delete this line

// Load playlists on page load
loadPlaylists();

export async function loadPlaylists() {
    try {
        const playlists = await loadPlaylistsRequest();
        renderPlaylists(playlists);
    } catch (error) {
        console.error('Error loading playlists:', error);
        alert('Failed to load playlists');
    }
}

export async function createPlaylist(playlistNameInput) { // Export createPlaylist, takes playlistNameInput
    const playlistName = playlistNameInput.value;
    if (playlistName) {
        try {
            const response = await createPlaylistRequest(playlistName); // Use createPlaylistRequest from api.js
            if (response) {
                hideModal(); // Make sure hideModal is in scope or imported
                loadPlaylists(); // Reload playlists
            } else {
                console.error('Error creating playlist:', response.status);
                alert('Failed to create playlist');
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Failed to create playlist');
        }
    }
}


export async function deletePlaylist(playlistId) { // Export deletePlaylist
    if (confirm("Are you sure you want to delete this playlist?")) {
        try {
            await deletePlaylistRequest(playlistId); // Use deletePlaylistRequest from api.js
            loadPlaylists(); // Reload playlists
        } catch (error) {
            console.error('Error deleting playlist:', error);
            alert('Failed to delete playlist');
        }
    }
}


export async function loadPlaylistTracks(playlistId) { // Export loadPlaylistTracks
    try {
        const tracks = await loadPlaylistTracksRequest(playlistId); // Use loadPlaylistTracksRequest from api.js
        renderResults(tracks);  // Display playlist tracks in the results section
    } catch (error) {
        console.error('Error loading playlist tracks:', error);
        alert('Failed to load playlist tracks');
    }
}

export async function removeTrackFromPlaylist(playlistTrackId) { // Export removeTrackFromPlaylist
    try {
        await removeTrackFromPlaylistRequest(playlistTrackId); // Use removeTrackFromPlaylistRequest from api.js
        alert('Track removed from playlist successfully!');
        // Refresh the playlist tracks after successful removal (you'll need to determine playlistId here)
        // For now, let's just reload playlists to keep it simple
        loadPlaylists();
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        alert('Failed to remove track from playlist');
    }
}