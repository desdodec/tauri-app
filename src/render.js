// render.js
import {
    resultsDiv,
    playlistsDiv,
    createPlaylistModal,
    addToPlaylistModal,
    playlistsList,
    playlistNameInput,
    playlistsView,
    createPlaylistView,
    newPlaylistNameInput,
    firstPageButton,
    prevPageButton,
    nextPageButton,
    lastPageButton,
    pageInfoSpan,
    totalRecordsDiv
} from './elements.js';
import { formatDuration } from './utils.js';
import { loadPlaylistTracks, deletePlaylist, addTrackToPlaylist, addAlbumToPlaylist } from './playlist.js';
import { loadPlaylistsRequest } from './api.js';
import { getState, setCurrentPlaylistId } from './state.js';

// Default paths for missing resources
const DEFAULT_ALBUM_COVER = 'data/artwork/placeholder.jpg';

export function renderResults(response, totalRecords = 0, currentPage = 1) {
    resultsDiv.innerHTML = '';  // Clear existing results

    // Handle the new response format
    const results = Array.isArray(response) ? response : (response.tracks || []);
    totalRecords = totalRecords || (response.total || 0);
    currentPage = currentPage || (response.page || 1);

    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    const recordsPerPage = 10;
    const totalPages = Math.ceil(totalRecords / recordsPerPage);

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
        
        // Create main track info row
        const infoRow = document.createElement('tr');
        infoRow.innerHTML = `
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
                ${getState().currentPlaylistId ? `
                    <button class="deleteFromPlaylistBtn"
                            data-playlist-track-id="${track.playlist_track_id}">
                        Delete from Playlist
                    </button>
                ` : `
                    <button class="addToPlaylistBtn" data-track-id="${track.id}">
                        Add to Playlist
                    </button>
                    <button class="addAlbumToPlaylistBtn" data-catalogue-no="${track.id.split('_')[0]}">
                        Add Album to Playlist
                    </button>
                `}
            </td>
        `;
        tbody.appendChild(infoRow);

        // Create waveform row if audio path exists
        if (audioPath) {
            const waveformRow = document.createElement('tr');
            waveformRow.className = 'waveform-row';
            waveformRow.innerHTML = `
                <td colspan="7">
                    <div class="waveform-container" data-track-id="${track.id}">
                        <img src="data/waveforms/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.png"
                             class="waveform-base"
                             alt="Audio waveform"
                             onerror="this.style.display='none'; this.parentElement.style.display='none';">
                        <img src="data/waveforms/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}_over.png"
                             class="waveform-overlay"
                             alt="Audio progress"
                             onerror="this.style.display='none';">
                    </div>
                </td>
            `;
            tbody.appendChild(waveformRow);
        }
    });

    resultsDiv.appendChild(table);

    // Update pagination controls
    if (totalRecords > 10) {
        // Update button states
        firstPageButton.disabled = currentPage <= 1;
        prevPageButton.disabled = currentPage <= 1;
        nextPageButton.disabled = currentPage >= totalPages;
        lastPageButton.disabled = currentPage >= totalPages;

        // Update page info
        pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
        totalRecordsDiv.textContent = `Total Records: ${totalRecords}`;

        // Update click handlers
        firstPageButton.onclick = () => currentPage > 1 && loadPlaylistTracks(currentPlaylistId, 1);
        prevPageButton.onclick = () => currentPage > 1 && loadPlaylistTracks(currentPlaylistId, currentPage - 1);
        nextPageButton.onclick = () => currentPage < totalPages && loadPlaylistTracks(currentPlaylistId, currentPage + 1);
        lastPageButton.onclick = () => currentPage < totalPages && loadPlaylistTracks(currentPlaylistId, totalPages);
    }
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

export function showAddToPlaylistModal(id, isAlbum = false) {
    if (!id) {
        console.error('No ID provided to showAddToPlaylistModal');
        return;
    }
    
    const type = isAlbum ? 'album' : 'track';
    console.log(`Showing add to playlist modal for ${type}:`, id);
    
    addToPlaylistModal.style.display = "block";
    addToPlaylistModal.dataset.id = id;
    addToPlaylistModal.dataset.type = type;
    
    console.log('Stored in add to playlist modal:', {
        id: addToPlaylistModal.dataset.id,
        type: addToPlaylistModal.dataset.type
    });
    
    renderPlaylistOptions();
}

export function hideAddToPlaylistModal() {
    console.log('Hiding add to playlist modal');
    addToPlaylistModal.style.display = "none";
    addToPlaylistModal.dataset.id = '';
    addToPlaylistModal.dataset.type = '';
    
    // Reset view states
    createPlaylistView.style.display = 'none';
    playlistsView.style.display = 'block';
    newPlaylistNameInput.value = '';
    
    // Clear any pending IDs in create playlist modal
    if (createPlaylistModal) {
        createPlaylistModal.dataset.pendingId = '';
        createPlaylistModal.dataset.pendingType = '';
    }
}

export function hideModal() {
    console.log('Hiding create playlist modal');
    createPlaylistModal.style.display = "none";
    if (playlistNameInput) {
        playlistNameInput.value = ""; // Clear input
    }
    // Don't clear pendingTrackId here as it's needed for playlist creation
    // It will be cleared after successful playlist creation in playlist.js
}

async function renderPlaylistOptions() {
    console.log('render.js: Starting renderPlaylistOptions');
    try {
        const playlists = await loadPlaylistsRequest();
        console.log('render.js: Loaded playlists:', playlists);
        playlistsList.innerHTML = '';

        playlists.forEach(playlist => {
            const option = document.createElement('div');
            option.className = 'playlist-option';
            option.textContent = playlist.name;
            option.dataset.playlistId = playlist.id;
            
            option.addEventListener('click', async () => {
                const id = addToPlaylistModal.dataset.id;
                const type = addToPlaylistModal.dataset.type;
                
                console.log('render.js: Playlist option clicked:', {
                    playlistId: playlist.id,
                    playlistName: playlist.name,
                    itemToAdd: { id, type }
                });
                
                try {
                    if (type === 'album') {
                        console.log('render.js: Adding album to playlist:', {
                            playlistId: playlist.id,
                            catalogueNo: id
                        });
                        await addAlbumToPlaylist(playlist.id, id);
                        console.log('render.js: Album added successfully');
                        alert('Album added to playlist successfully!');
                    } else {
                        console.log('render.js: Adding track to playlist:', {
                            playlistId: playlist.id,
                            trackId: id
                        });
                        await addTrackToPlaylist(playlist.id, id);
                        console.log('render.js: Track added successfully');
                    }
                    hideAddToPlaylistModal();
                } catch (error) {
                    console.error('render.js: Failed to add item to playlist:', {
                        playlistId: playlist.id,
                        itemType: type,
                        itemId: id,
                        error: error.message
                    });
                    alert(`Failed to add ${type} to playlist: ${error.message}`);
                }
            });
            playlistsList.appendChild(option);
        });
    } catch (error) {
        console.error('render.js: Error in renderPlaylistOptions:', error);
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