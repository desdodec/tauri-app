// events.js
import { performSearch } from './search.js';
import {
    searchBox,
    clearButton,
    filterButtons,
    dropdownInput,
    firstPageButton,
    prevPageButton,
    nextPageButton,
    lastPageButton,
    createPlaylistBtn,
    cancelBtn,
    confirmBtn,
    dropdownColumn,
    playlistNameInput,
    searchButton,
    resultsDiv,
    closePlaylistBtn,
    createPlaylistModal,
    addToPlaylistModal,
    closeAddPlaylistBtn,
    cancelAddToPlaylistBtn,
    createNewPlaylistBtn,
    playlistsView,
    createPlaylistView,
    newPlaylistNameInput,
    backToPlaylistsBtn,
    confirmNewPlaylistBtn
} from './elements.js';
import { loadPlaylists, addTrackToPlaylist, addAlbumToPlaylist, removeTrackFromPlaylist } from './playlist.js';
import { showModal, hideModal, showAddToPlaylistModal, hideAddToPlaylistModal } from './render.js';
import { createPlaylist } from './playlist.js';
import {
    getState,
    setCurrentPage,
    setActiveFilter,
    updateState,
    setSound,
    resetSearchState,
    setWaveformProgress,
    setAudioPosition,
    setWaveformDimensions
} from './state.js';
import { debounce } from './utils.js';

// Get Howl from window since it's loaded via script tag
const { Howl } = window;

// Create debounced version of search for input events
const debouncedInputSearch = debounce(() => performSearch(false), 300);

// ----------------------------------------------------------------------------
// Event listeners (Attaching event listeners to the HTML elements)
// ----------------------------------------------------------------------------

// Search Button Click: Triggers the search function
searchButton.addEventListener('click', () => performSearch(false));

// Clear Button Click: Clears the search input, dropdown, and resets filters and pagination
clearButton.addEventListener('click', () => {
    searchBox.value = '';
    dropdownInput.value = '';

    // Reset all search-related state
    resetSearchState();

    // Update UI to reflect state changes
    filterButtons.forEach(btn => btn.classList.remove('active-filter'));
    document.querySelector('[data-filter="all"]').classList.add('active-filter');
    
    // Reset dropdownColumn to default value
    dropdownColumn.value = 'id';

    // Stop any playing audio
    const state = getState();
    if (state.sound) {
        state.sound.stop();
        setSound(null);
    }

    // Show default message and reset pagination
    resultsDiv.innerHTML = '<p>Please perform a search.</p>';
    document.getElementById('totalRecords').textContent = 'Total Records: 0';
    document.getElementById('pageInfo').textContent = 'Page 1 of 1';
    
    // Disable pagination buttons
    firstPageButton.disabled = true;
    prevPageButton.disabled = true;
    nextPageButton.disabled = true;
    lastPageButton.disabled = true;
});

// Filter Buttons: Use state management for filter changes
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Update UI
        filterButtons.forEach(btn => btn.classList.remove('active-filter'));
        button.classList.add('active-filter');
        
        // Update state
        setActiveFilter(button.dataset.filter);
        setCurrentPage(1); // Reset to first page when filter changes
        
        performSearch(false);
    });
});

// Add debounced search on input and dropdown column changes
searchBox.addEventListener('input', debouncedInputSearch);

// Handle dropdown input changes
dropdownInput.addEventListener('input', (event) => {
    console.log('Dropdown input changed:', {
        value: event.target.value,
        column: dropdownColumn.value
    });
    // Reset to first page when dropdown input changes
    setCurrentPage(1);
    debouncedInputSearch();
});

// Handle dropdown column changes
dropdownColumn.addEventListener('change', () => {
    console.log('Dropdown column changed:', {
        newColumn: dropdownColumn.value,
        currentInputValue: dropdownInput.value
    });
    // Only perform search if there's a value in the dropdown input
    if (dropdownInput.value.trim()) {
        performSearch(false);
    }
});

// Pagination Button Event Listeners
firstPageButton.addEventListener('click', () => {
    console.log('First page button clicked');
    setCurrentPage(1);
    performSearch(true);
});

prevPageButton.addEventListener('click', () => {
    const { currentPage } = getState();
    console.log('Previous page button clicked, current page:', currentPage);
    if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
        performSearch(true);
    }
});

nextPageButton.addEventListener('click', () => {
    const state = getState();
    const { currentPage, recordsPerPage, totalRecords } = state;
    const maxPage = Math.ceil(totalRecords / recordsPerPage);
    
    console.log('Next page button clicked', {
        currentPage,
        recordsPerPage,
        totalRecords,
        maxPage
    });
    
    if (currentPage < maxPage) {
        console.log('Moving to next page:', currentPage + 1);
        setCurrentPage(currentPage + 1);
        performSearch(true);
    } else {
        console.log('Already at last page');
    }
});

lastPageButton.addEventListener('click', () => {
    const { recordsPerPage, totalRecords } = getState();
    const lastPage = Math.ceil(totalRecords / recordsPerPage);
    console.log('Last page button clicked, going to page:', lastPage);
    setCurrentPage(lastPage);
    performSearch(true);
});

// Add to Playlist Event Handler
resultsDiv.addEventListener('click', async (event) => {
    if (event.target.classList.contains('addToPlaylistBtn')) {
        const trackId = event.target.dataset.trackId;
        showAddToPlaylistModal(trackId, false);
        return;
    }
    
    if (event.target.classList.contains('addAlbumToPlaylistBtn')) {
        const catalogueNo = event.target.dataset.catalogueNo;
        showAddToPlaylistModal(catalogueNo, true);
        return;
    }

    if (event.target.classList.contains('deleteFromPlaylistBtn')) {
        const playlistTrackId = event.target.dataset.playlistTrackId;
        const trackId = event.target.closest('tr').querySelector('.playPauseBtn').dataset.trackId;
        
        if (confirm('Are you sure you want to remove this track from the playlist?')) {
            try {
                // Check if this track is currently playing
                const state = getState();
                if (state.currentTrackId === trackId && state.sound) {
                    // Stop the audio
                    state.sound.stop();
                    state.sound.unload();
                    setSound(null);
                    updateState({
                        currentTrackId: null,
                        waveformProgress: 0,
                        audioPosition: 0,
                        pendingSeekPosition: undefined
                    });
                }
                
                await removeTrackFromPlaylist(playlistTrackId);
                // Playlist tracks will be reloaded by removeTrackFromPlaylist
            } catch (error) {
                console.error('Error removing track from playlist:', error);
                alert('Failed to remove track from playlist: ' + error.message);
            }
        }
        return;
    }
});

// Add to Playlist Modal Event Handlers
closeAddPlaylistBtn.addEventListener('click', () => {
    console.log('Close button clicked');
    hideAddToPlaylistModal();
});

cancelAddToPlaylistBtn.addEventListener('click', () => {
    console.log('Cancel button clicked');
    hideAddToPlaylistModal();
});

// Wait for DOM to be loaded
document.addEventListener('DOMContentLoaded', () => {
    // Toggle to create playlist view
    createNewPlaylistBtn.addEventListener('click', () => {
        playlistsView.style.display = 'none';
        createPlaylistView.style.display = 'block';
        newPlaylistNameInput.value = '';
        newPlaylistNameInput.focus();
    });

    // Back to playlists list
    backToPlaylistsBtn.addEventListener('click', () => {
        createPlaylistView.style.display = 'none';
        playlistsView.style.display = 'block';
    });

    // Create new playlist within modal
    confirmNewPlaylistBtn.addEventListener('click', async () => {
        const id = addToPlaylistModal.dataset.id;
        const type = addToPlaylistModal.dataset.type;
        const playlistName = newPlaylistNameInput.value.trim();
        
        if (!playlistName) {
            alert('Please enter a playlist name');
            return;
        }

        try {
            const playlist = await createPlaylist({ value: playlistName });
            if (playlist) {
                if (type === 'album') {
                    await addAlbumToPlaylist(playlist.id, id);
                } else {
                    await addTrackToPlaylist(playlist.id, id);
                }
                hideAddToPlaylistModal();
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('Failed to create playlist: ' + error.message);
        }
    });
});


// When clicking outside the modal, close it
addToPlaylistModal.addEventListener('click', (event) => {
    if (event.target === addToPlaylistModal) {
        hideAddToPlaylistModal();
    }
});

// Handle cancel button in create playlist modal
cancelBtn.addEventListener('click', () => {
    createPlaylistModal.dataset.pendingTrackId = '';
    hideModal();
});

// Create playlist modal close handlers
closePlaylistBtn.addEventListener('click', () => {
    console.log('Close button clicked on create playlist modal');
    createPlaylistModal.dataset.pendingTrackId = '';
    hideModal();
});

// When clicking outside the create playlist modal, close it
createPlaylistModal.addEventListener('click', (event) => {
    if (event.target === createPlaylistModal) {
        console.log('Clicked outside create playlist modal');
        createPlaylistModal.dataset.pendingTrackId = '';
        hideModal();
    }
});

// Audio Playback Event Listeners
resultsDiv.addEventListener('click', async (event) => {
    if (event.target.classList.contains('playPauseBtn')) {
        const audioPath = event.target.dataset.audioPath;
        const trackId = event.target.dataset.trackId;
        
        const state = getState();
        
        // Handle play/pause for current track
        if (state.sound && event.target.dataset.trackId === state.currentTrackId) {
            if (state.sound.playing()) {
                state.sound.pause();
                event.target.textContent = 'Play';
            } else {
                state.sound.play();
                event.target.textContent = 'Pause';
            }
            return;
        }

        // Stop and unload previous track if a different one is clicked
        if (state.sound) {
            state.sound.stop();
            state.sound.unload();
            setSound(null);
            // Reset previous track's button
            const prevButton = document.querySelector(`.playPauseBtn[data-track-id="${state.currentTrackId}"]`);
            if (prevButton) {
                prevButton.textContent = 'Play';
            }
            updateState({ currentTrackId: null });
            // Wait for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Create and play new sound
        const sound = new Howl({
            src: [audioPath],
            html5: true,
            onload: () => {
                console.log('Sound loaded:', trackId);
                
                // Check for pending seek position
                const state = getState();
                if (state.pendingSeekPosition !== undefined) {
                    const duration = sound.duration();
                    const newPosition = (duration * state.pendingSeekPosition) / 100;
                    sound.seek(newPosition);
                    setWaveformProgress(state.pendingSeekPosition);
                    setAudioPosition(newPosition);
                    // Clear pending position
                    updateState({ pendingSeekPosition: undefined });
                }
                
                sound.play();
                updateWaveformProgress(sound);
                
                // Initialize overlay for this track
                const overlay = document.querySelector(
                    `.waveform-container[data-track-id="${trackId}"] .waveform-overlay`
                );
                if (overlay) {
                    overlay.style.display = 'block';
                    overlay.style.clipPath = 'inset(0 100% 0 0)';
                }
            },
            onplay: () => {
                console.log('Playing:', trackId);
                event.target.textContent = 'Pause';
                updateState({ currentTrackId: trackId });
                // Start progress updates
                requestAnimationFrame(() => updateWaveformProgress(sound));
                
                // Show overlay for this track
                const overlay = document.querySelector(
                    `.waveform-container[data-track-id="${trackId}"] .waveform-overlay`
                );
                if (overlay) {
                    overlay.style.display = 'block';
                }
            },
            onpause: () => {
                console.log('Paused:', trackId);
                event.target.textContent = 'Play';
                // Keep overlay visible but stop updates
            },
            onend: () => {
                console.log('Ended:', trackId);
                event.target.textContent = 'Play';
                setSound(null);
                updateState({
                    currentTrackId: null,
                    waveformProgress: 0,
                    audioPosition: 0
                });
                
                // Reset overlay
                const overlay = document.querySelector(
                    `.waveform-container[data-track-id="${trackId}"] .waveform-overlay`
                );
                if (overlay) {
                    overlay.style.width = '0%';
                    overlay.style.display = 'none';
                }
            },
            onstop: () => {
                console.log('Stopped:', trackId);
                event.target.textContent = 'Play';
                setSound(null);
                updateState({
                    currentTrackId: null,
                    waveformProgress: 0,
                    audioPosition: 0
                });
                
                // Reset overlay
                const overlay = document.querySelector(
                    `.waveform-container[data-track-id="${trackId}"] .waveform-overlay`
                );
                if (overlay) {
                    overlay.style.width = '0%';
                    overlay.style.display = 'none';
                }
            },
            onseek: () => {
                // Update progress when seeking
                updateWaveformProgress(sound);
            }
        });

        // Set the sound in state before loading
        setSound(sound);
    }
});

// Waveform click handler
resultsDiv.addEventListener('click', async (event) => {
    const waveformContainer = event.target.closest('.waveform-container');
    if (!waveformContainer) return;

    const trackId = waveformContainer.dataset.trackId;
    const state = getState();
    
    // Find the play button for this track
    const playButton = document.querySelector(`.playPauseBtn[data-track-id="${trackId}"]`);
    if (!playButton) return;

    // Calculate click position first
    const rect = waveformContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const progress = (clickX / rect.width) * 100;

    // Store the desired position in state
    updateState({
        pendingSeekPosition: progress
    });

    // If this isn't the current track or no sound is playing, start playback
    if (trackId !== state.currentTrackId || !state.sound) {
        playButton.click(); // This will trigger the existing play logic
        // Position will be set in onload handler
        return;
    }
    
    const sound = state.sound;
    if (!sound) return;

    // If sound is already playing, seek directly
    const duration = sound.duration();
    const newPosition = (duration * progress) / 100;
    
    sound.seek(newPosition);
    setWaveformProgress(progress);
    setAudioPosition(newPosition);
    
    // Store waveform dimensions for future calculations
    setWaveformDimensions({
        width: rect.width,
        height: rect.height
    });
});

// Function to update waveform progress
function updateWaveformProgress(sound) {
    if (!sound) return;

    const seek = sound.seek() || 0;
    const duration = sound.duration();
    const progress = (seek / duration) * 100;

    // Update state
    setWaveformProgress(progress);
    setAudioPosition(seek);

    // Update overlay width to show progress
    const currentTrackId = getState().currentTrackId;
    if (currentTrackId) {
        const container = document.querySelector(
            `.waveform-container[data-track-id="${currentTrackId}"]`
        );
        if (container) {
            const overlay = container.querySelector('.waveform-overlay');
            if (overlay) {
                // Ensure overlay is visible and sized correctly
                overlay.style.display = 'block';
                overlay.style.width = '100%'; // Full width
                overlay.style.clipPath = `inset(0 ${100 - progress}% 0 0)`; // Clip from right
            }

            // Store dimensions for calculations
            const rect = container.getBoundingClientRect();
            setWaveformDimensions({
                width: rect.width,
                height: rect.height
            });
        }

        // Reset other overlays
        const otherContainers = document.querySelectorAll(
            `.waveform-container:not([data-track-id="${currentTrackId}"])`
        );
        otherContainers.forEach(container => {
            const overlay = container.querySelector('.waveform-overlay');
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.clipPath = 'inset(0 100% 0 0)';
            }
        });
    }

    // Continue updating while playing
    if (sound.playing()) {
        requestAnimationFrame(() => updateWaveformProgress(sound));
    }
}

// Modal Event Listeners
createPlaylistBtn.addEventListener("click", showModal);
cancelBtn.addEventListener("click", hideModal);

confirmBtn.addEventListener("click", async () => {
    try {
        const trackId = createPlaylistModal.dataset.pendingTrackId;
        console.log('Creating playlist with track:', { trackId });
        if (!trackId) {
            console.warn('No track ID found in modal dataset');
        }
        const playlist = await createPlaylist(playlistNameInput, trackId);
        if (playlist) {
            console.log('Playlist created successfully:', playlist);
            if (trackId) {
                console.log('Track should have been added:', { playlistId: playlist.id, trackId });
            }
        }
    } catch (error) {
        console.error('Error creating playlist:', error);
        alert('Error creating playlist: ' + error.message);
    }
});

// Subscribe to state changes to update UI elements
import { subscribe } from './state.js';

subscribe((state) => {
    // Update pagination button states
    const { currentPage, recordsPerPage, totalRecords } = state;
    const maxPage = Math.ceil(totalRecords / recordsPerPage);
    
    console.log('State updated in events.js:', {
        currentPage,
        recordsPerPage,
        totalRecords,
        maxPage
    });
    
    // Disable/enable previous/first page buttons
    prevPageButton.disabled = currentPage <= 1;
    firstPageButton.disabled = currentPage <= 1;
    
    // Disable/enable next/last page buttons
    nextPageButton.disabled = currentPage >= maxPage;
    lastPageButton.disabled = currentPage >= maxPage;
    
    // Update filter buttons
    filterButtons.forEach(btn => {
        btn.classList.toggle('active-filter', btn.dataset.filter === state.activeFilter);
    });
});