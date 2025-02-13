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
    createNewPlaylistBtn
} from './elements.js';
import { loadPlaylists, addTrackToPlaylist } from './playlist.js';
import { showModal, hideModal, showAddToPlaylistModal, hideAddToPlaylistModal } from './render.js';
import { createPlaylist } from './playlist.js';
import {
    getState,
    setCurrentPage,
    setActiveFilter,
    updateState,
    setSound,
    resetSearchState
} from './state.js';
import { debounce } from './utils.js';

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
        showAddToPlaylistModal(trackId);
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

// Create New Playlist from Add to Playlist Modal
createNewPlaylistBtn.addEventListener('click', () => {
    const trackId = addToPlaylistModal.dataset.trackId;
    hideAddToPlaylistModal();
    showModal();
    // Store the track ID in the create playlist modal
    createPlaylistModal.dataset.pendingTrackId = trackId;
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
resultsDiv.addEventListener('click', (event) => {
    if (event.target.classList.contains('playPauseBtn')) {
        const audioPath = event.target.dataset.audioPath;
        const trackId = event.target.dataset.trackId;
        
        const state = getState();
        
        // Stop current sound if playing
        if (state.sound) {
            state.sound.stop();
            setSound(null);
            
            // Reset all play buttons
            document.querySelectorAll('.playPauseBtn').forEach(btn => {
                btn.textContent = 'Play';
            });
            
            // If clicking the same track that was playing, just stop
            if (event.target.dataset.trackId === state.currentTrackId) {
                updateState({ currentTrackId: null });
                return;
            }
        }
        
        // Create and play new sound
        const sound = new Howl({
            src: [audioPath],
            html5: true,
            onplay: () => {
                event.target.textContent = 'Stop';
                updateState({ currentTrackId: trackId });
            },
            onend: () => {
                event.target.textContent = 'Play';
                setSound(null);
                updateState({ currentTrackId: null });
            },
            onstop: () => {
                event.target.textContent = 'Play';
                setSound(null);
                updateState({ currentTrackId: null });
            }
        });
        
        sound.play();
        setSound(sound);
    }
});

// Modal Event Listeners
createPlaylistBtn.addEventListener("click", showModal);
cancelBtn.addEventListener("click", hideModal);

confirmBtn.addEventListener("click", async () => {
    try {
        const trackId = createPlaylistModal.dataset.pendingTrackId;
        await createPlaylist(playlistNameInput, trackId);
        hideModal();
        // Clear the pending track ID
        createPlaylistModal.dataset.pendingTrackId = '';
    } catch (error) {
        console.error('Error creating playlist:', error);
        // You might want to show an error message in the modal
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