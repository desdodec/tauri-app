// render.js
import {
    resultsDiv,
    playlistsDiv,
    createPlaylistModal,
    addToPlaylistModal,
    playlistsList,
    playlistNameInput
} from './elements.js';
import { formatDuration } from './utils.js';
import { loadPlaylistTracks, deletePlaylist, addTrackToPlaylist } from './playlist.js';
import { loadPlaylistsRequest } from './api.js';

// Default paths for missing resources
const DEFAULT_ALBUM_COVER = 'data/artwork/placeholder.jpg';

export function renderResults(results) {
    resultsDiv.innerHTML = '';  // Clear existing results

    if (results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th></th>  <!-- Image Column -->
                <th>ID</th>
                <th>Title</th>
                <th>Description</th>
                <th>Version</th>
                <th>Duration</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    results.forEach(track => {
        const formattedDuration = formatDuration(track.duration);
        
        // Use default album cover if the track's cover is not available
        const albumCoverPath = track.albumCoverPath || DEFAULT_ALBUM_COVER;
        
        // Only show audio controls if the audio path exists
        const audioPath = track.audioPath || '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${albumCoverPath}" 
                     alt="Album Cover" 
                     width="80" 
                     height="80"
                     onerror="this.src='${DEFAULT_ALBUM_COVER}'"
                >
            </td>
            <td>${track.id}</td>
            <td>${track.title}</td>
            <td>${track.description || ''}</td>
            <td>${track.version || ''}</td>
            <td>${formattedDuration}</td>
            <td class="action-buttons">
                ${audioPath ? `
                    <button class="playPauseBtn" 
                            data-track-id="${track.id}" 
                            data-audio-path="${audioPath}">
                        Play
                    </button>
                ` : '<button class="playPauseBtn" disabled>No Audio</button>'}
                <button class="addToPlaylistBtn" data-track-id="${track.id}">
                    Add to Playlist
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    resultsDiv.appendChild(table);
}

export function renderPlaylists(playlists) {
    playlistsDiv.innerHTML = ""; // Clear existing playlists
    
    if (!playlists || playlists.length === 0) {
        playlistsDiv.innerHTML = '<p>No playlists found.</p>';
        return;
    }

    playlists.forEach(playlist => {
        const playlistItem = document.createElement("div");
        playlistItem.className = 'playlist-item';
        
        const playlistContent = document.createElement("div");
        playlistContent.className = 'playlist-content';
        playlistContent.innerHTML = `<span>${playlist.name}</span>`;
        playlistContent.addEventListener('click', () => loadPlaylistTracks(playlist.id));
        
        const deleteButton = document.createElement("button");
        deleteButton.className = 'deleteBtn';
        deleteButton.textContent = 'Delete';
        deleteButton.setAttribute('data-id', playlist.id);
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();  // Prevent loading tracks when deleting
            deletePlaylist(playlist.id); // Remove confirm dialog here since it's in playlist.js
        });

        playlistItem.appendChild(playlistContent);
        playlistItem.appendChild(deleteButton);
        playlistsDiv.appendChild(playlistItem);
    });
}

export function showModal() {
    console.log('Showing create playlist modal');
    createPlaylistModal.style.display = "block";
}

export function showAddToPlaylistModal(trackId) {
    console.log('Showing add to playlist modal for track:', trackId);
    addToPlaylistModal.style.display = "block";
    addToPlaylistModal.dataset.trackId = trackId;
    renderPlaylistOptions();
}

export function hideAddToPlaylistModal() {
    console.log('Hiding add to playlist modal');
    addToPlaylistModal.style.display = "none";
    addToPlaylistModal.dataset.trackId = '';
    // Clear any pending track ID in create playlist modal
    if (createPlaylistModal) {
        createPlaylistModal.dataset.pendingTrackId = '';
    }
}

export function hideModal() {
    console.log('Hiding create playlist modal');
    createPlaylistModal.style.display = "none";
    if (playlistNameInput) {
        playlistNameInput.value = ""; // Clear input
    }
    // Clear any pending track ID
    createPlaylistModal.dataset.pendingTrackId = '';
}

async function renderPlaylistOptions() {
    try {
        const playlists = await loadPlaylistsRequest();
        playlistsList.innerHTML = '';

        playlists.forEach(playlist => {
            const option = document.createElement('div');
            option.className = 'playlist-option';
            option.textContent = playlist.name;
            option.dataset.playlistId = playlist.id;
            option.addEventListener('click', () => {
                const trackId = addToPlaylistModal.dataset.trackId;
                addTrackToPlaylist(playlist.id, trackId)
                    .then(() => {
                        hideAddToPlaylistModal();
                        console.log('Track added successfully');
                    })
                    .catch(error => {
                        console.error('Failed to add track:', error);
                        alert('Failed to add track to playlist');
                    });
            });
            playlistsList.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading playlists:', error);
        playlistsList.innerHTML = '<div class="error-message">Failed to load playlists</div>';
    }
}

// Error handling for resource loading
window.addEventListener('error', function(e) {
    // Handle image loading errors
    if (e.target.tagName === 'IMG') {
        console.warn('Failed to load image:', e.target.src);
        e.target.src = DEFAULT_ALBUM_COVER;
    }
}, true);