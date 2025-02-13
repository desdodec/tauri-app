// playlist.js
import {
    loadPlaylistsRequest,
    deletePlaylistRequest,
    createPlaylistRequest,
    loadPlaylistTracksRequest,
    removeTrackFromPlaylistRequest,
    addTrackToPlaylistRequest
} from './api.js';
import { playlistsDiv, playlistNameInput } from './elements.js';
import { renderPlaylists, renderResults, hideModal } from './render.js';

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

export async function createPlaylist(playlistNameInput, trackId = null) {
    const playlistName = playlistNameInput.value;
    if (!playlistName) {
        alert('Please enter a playlist name');
        return null;
    }

    try {
        console.log('Creating playlist:', { name: playlistName, trackId });
        const playlist = await createPlaylistRequest(playlistName);
        
        if (!playlist) {
            throw new Error('Failed to create playlist - no response');
        }

        // If trackId is provided, add the track to the new playlist
        if (trackId) {
            try {
                await addTrackToPlaylist(playlist.id, trackId);
                console.log('Track added to new playlist:', { trackId, playlistId: playlist.id });
            } catch (error) {
                console.error('Error adding track to new playlist:', error);
                alert('Playlist created but failed to add track');
            }
        }
        
        await loadPlaylists(); // Reload playlists
        hideModal(); // Only hide modal after everything is done
        playlistNameInput.value = ''; // Clear the input
        return playlist;

    } catch (error) {
        console.error('Error creating playlist:', error);
        alert('Failed to create playlist: ' + error.message);
        return null;
    }
}

export async function deletePlaylist(playlistId) {
    if (confirm("Are you sure you want to delete this playlist?")) {
        try {
            await deletePlaylistRequest(playlistId);
            loadPlaylists(); // Reload playlists
        } catch (error) {
            console.error('Error deleting playlist:', error);
            alert('Failed to delete playlist');
        }
    }
}

export async function loadPlaylistTracks(playlistId) {
    try {
        const tracks = await loadPlaylistTracksRequest(playlistId);
        renderResults(tracks);  // Display playlist tracks in the results section
    } catch (error) {
        console.error('Error loading playlist tracks:', error);
        alert('Failed to load playlist tracks');
    }
}

export async function addTrackToPlaylist(playlistId, trackId) {
    try {
        const response = await addTrackToPlaylistRequest(playlistId, trackId);
        console.log('Track added to playlist:', response);
        return response;
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        throw error;
    }
}

export async function removeTrackFromPlaylist(playlistTrackId) {
    try {
        await removeTrackFromPlaylistRequest(playlistTrackId);
        alert('Track removed from playlist successfully!');
        loadPlaylists();
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        alert('Failed to remove track from playlist');
    }
}