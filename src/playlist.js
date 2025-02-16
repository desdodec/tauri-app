// playlist.js
import {
    loadPlaylistsRequest,
    deletePlaylistRequest,
    createPlaylistRequest,
    loadPlaylistTracksRequest,
    removeTrackFromPlaylistRequest,
    addTrackToPlaylistRequest,
    addAlbumToPlaylistRequest
} from './api.js';
import { playlistsDiv, playlistNameInput } from './elements.js';
import { renderPlaylists, renderResults, hideModal } from './render.js';
import { getState, setCurrentPlaylistId } from './state.js';

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
                const result = await addTrackToPlaylist(playlist.id, trackId);
                console.log('Track added to new playlist:', { trackId, playlistId: playlist.id, result });
                if (!result) {
                    throw new Error('Failed to add track - no response');
                }
            } catch (error) {
                console.error('Error adding track to new playlist:', error);
                alert('Playlist created but failed to add track');
                // Still continue to complete the playlist creation
            }
        }
        
        await loadPlaylists(); // Reload playlists
        playlistNameInput.value = ''; // Clear the input
        hideModal(); // Only hide modal after everything is done and input is cleared
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

export async function loadPlaylistTracks(playlistId, page = 1) {
    try {
        setCurrentPlaylistId(playlistId); // Set current playlist ID
        const response = await loadPlaylistTracksRequest(playlistId, page);
        console.log('Loaded playlist tracks:', {
            playlistId,
            total: response.total,
            page: response.page,
            tracks: response.tracks ? response.tracks.length : 'N/A',
            response
        });
        
        if (!response || !response.tracks) {
            console.error('Invalid response format:', response);
            throw new Error('Invalid response format from server');
        }
        
        renderResults(response);  // Pass the entire response object
    } catch (error) {
        console.error('Error loading playlist tracks:', error);
        alert('Failed to load playlist tracks: ' + error.message);
    }
}

export async function addTrackToPlaylist(playlistId, trackId) {
    if (!playlistId || !trackId) {
        console.error('Missing required parameters:', { playlistId, trackId });
        throw new Error('Both playlist ID and track ID are required');
    }

    try {
        console.log('Attempting to add track to playlist:', { playlistId, trackId });
        const response = await addTrackToPlaylistRequest(playlistId, trackId);
        
        if (!response) {
            throw new Error('No response received from server');
        }

        console.log('Track added to playlist successfully:', response);
        await loadPlaylists(); // Refresh the playlists view
        return response;
    } catch (error) {
        console.error('Error adding track to playlist:', error);
        throw new Error('Failed to add track to playlist: ' + error.message);
    }
}

export async function addAlbumToPlaylist(playlistId, catalogueNo) {
    console.log('playlist.js: Starting addAlbumToPlaylist:', {
        playlistId,
        catalogueNo,
        type: typeof catalogueNo
    });

    if (!playlistId || !catalogueNo) {
        const error = new Error('Both playlist ID and catalogue number are required');
        console.error('playlist.js: Parameter validation failed:', {
            playlistId,
            catalogueNo,
            error: error.message
        });
        throw error;
    }

    try {
        console.log('playlist.js: Validated parameters, making API request');
        const response = await addAlbumToPlaylistRequest(playlistId, catalogueNo);
        
        if (!response) {
            const error = new Error('No response received from server');
            console.error('playlist.js: Empty response:', error.message);
            throw error;
        }

        console.log('playlist.js: Album added successfully:', {
            response,
            playlistId,
            catalogueNo
        });

        console.log('playlist.js: Refreshing playlists view');
        await loadPlaylists();
        
        return response;
    } catch (error) {
        console.error('playlist.js: Error in addAlbumToPlaylist:', {
            playlistId,
            catalogueNo,
            error: error.message,
            stack: error.stack
        });
        throw new Error('Failed to add album to playlist: ' + error.message);
    }
}

export async function removeTrackFromPlaylist(playlistTrackId) {
    try {
        await removeTrackFromPlaylistRequest(playlistTrackId);
        console.log('Track removed successfully:', { playlistTrackId });
        // Reload both the playlists and the current playlist's tracks
        await loadPlaylists();
        // Get current playlist ID from state
        const { currentPlaylistId } = getState();
        if (currentPlaylistId) {
            await loadPlaylistTracks(currentPlaylistId);
        }
    } catch (error) {
        console.error('Error removing track from playlist:', error);
        throw new Error('Failed to remove track from playlist: ' + error.message);
    }
}