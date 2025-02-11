// render.js
import { resultsDiv, playlistsDiv, modal } from './elements.js'; // Import modal
import { formatDuration } from './utils.js';

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
                <th>Duration</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');

    results.forEach(track => {
        const formattedDuration = formatDuration(track.duration);
        const albumCoverPath = track.albumCoverPath;
        const audioPath = track.audioPath;
        const waveformBasePath = track.waveformBasePath;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${albumCoverPath}" alt="Album Cover" width="80" height="80"></td>
            <td>${track.id}</td>
            <td>${track.title}</td>
            <td>${track.description || ''}</td>
            <td>${formattedDuration}</td>
            <td>
                <button class="playPauseBtn" data-track-id="${track.id}" data-audio-path="${audioPath}">Play</button>
                <button class="addToPlaylistBtn" data-track-id="${track.id}">Add to Playlist</button>
                ${waveformBasePath ? `<img src="${waveformBasePath}" alt="Waveform" width="200" height="50">` : '<p>No Waveform</p>'}
            </td>
        `;
        tbody.appendChild(row);
    });

    resultsDiv.appendChild(table);
}

export function renderPlaylists(playlists) {
    playlistsDiv.innerHTML = ""; // Clear existing playlists
    playlists.forEach(playlist => {
        const playlistElement = document.createElement("div");
        playlistElement.innerHTML = `
            <span>${playlist.name}</span>
            <button class="deleteBtn" data-id="${playlist.id}">Delete</button>
        `;
        playlistElement.addEventListener('click', () => loadPlaylistTracks(playlist.id)); // Add event listener
        playlistsDiv.appendChild(playlistElement);

        const deleteBtn = playlistElement.querySelector(".deleteBtn");
        deleteBtn.addEventListener("click", (event) => {
          event.stopPropagation();  // Prevent loading tracks when deleting
          deletePlaylist(playlist.id);
        });
    });
}

export function showModal() { // Export showModal
    modal.style.display = "block";
}

export function hideModal() {  // Export hideModal
    modal.style.display = "none";
    playlistNameInput.value = ""; // Clear input
}