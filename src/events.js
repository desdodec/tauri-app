// events.js
import { performSearch } from './search.js';
import { searchBox, clearButton, filterButtons, dropdownInput, firstPageButton, prevPageButton, nextPageButton, lastPageButton, createPlaylistBtn, cancelBtn, confirmBtn, dropdownColumn, playlistNameInput } from './elements.js';

// Event listeners (Attaching event listeners to the HTML elements)
// Search Button Click:  Triggers the performSearch function when the Search button is clicked
searchButton.addEventListener('click', () => performSearch());

// Clear Button Click: Clears the search input, dropdown, and resets filters and pagination
clearButton.addEventListener('click', () => {
    searchBox.value = '';
    dropdownInput.value = '';

    // Select the "All Tracks" filter button
    filterButtons.forEach(btn => btn.classList.remove('active-filter'));
    document.querySelector('[data-filter="all"]').classList.add('active-filter');
    activeFilter = 'all';

    // Reset currentPage
    currentPage = 1;

    // Reset dropdownColumn to default value
    dropdownColumn.value = 'id';
    initialLoad = true;

    performSearch(); // Perform a new search to refresh the results and pagination
});

//Filter Buttons: Attaches event listeners to each filter button to update the active filter and perform a new search
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from other buttons
        filterButtons.forEach(btn => btn.classList.remove('active-filter'));
        button.classList.add('active-filter');
        activeFilter = button.dataset.filter;
        performSearch();
    });
});

// Add search on enter press
searchBox.addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    performSearch();
  }
});

// Call search function to trigger results
dropdownInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      performSearch();
    }
  });

// Pagination Button Event Listeners: Attaches event listeners to the pagination buttons to navigate through the search results
firstPageButton.addEventListener('click', () => {
    currentPage = 1;
    performSearch();
});

prevPageButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        performSearch();
    }
});

nextPageButton.addEventListener('click', () => {
    if (currentPage * recordsPerPage < totalRecords) {
        currentPage++;
        performSearch();
    }
});

lastPageButton.addEventListener('click', () => {
    currentPage = Math.ceil(totalRecords / recordsPerPage);
    performSearch();
});

createPlaylistBtn.addEventListener("click", showModal);
cancelBtn.addEventListener("click", hideModal);
confirmBtn.addEventListener("click", createPlaylist);
document.querySelector('.close').addEventListener('click', hideModal);

// playlistModal is the name of the modal

function showModal() {
    playlistModal.style.display = "block";
}

function hideModal() {
    playlistModal.style.display = "none";
    playlistNameInput.value = ""; // Clear input
}