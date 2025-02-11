const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    let playlists = [];
    let modal = null;

    // Function to load playlist tracks - Placeholder, replace with your actual logic
    function loadPlaylistTracks(playlistId) {
        console.log("loadPlaylistTracks called with ID:", playlistId);
    }

    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    createPlaylistBtn.addEventListener('click', () => {
      console.log("Create list button clicked");
      let name = prompt("Please enter playlist name:", "New Playlist")
      if(name != null && name != ""){
            ipcRenderer.send('create-playlist', name);
      }
    });

    // Function to render playlists in the sidebar
    function renderPlaylists() {
      // Clear what's there
      const playlistSection = document.getElementById('playlists');
      playlistSection.innerHTML = '';

      playlists.forEach(playlist => {
        const playlistButton = document.createElement('button');
        // Show name
        playlistButton.textContent = playlist.name;

        // Set the function for when selected
        playlistButton.addEventListener('click', () => {
            loadPlaylistTracks(playlist.id);
        });

        playlistSection.appendChild(playlistButton);
      });
    }

    ipcRenderer.on('playlists-loaded', (event, data) => {
        playlists = data;
        renderPlaylists();
    });

    ipcRenderer.on('playlist-created', (event, newPlaylist) => {
        playlists.push(newPlaylist); // Add new playlist to the playlists array
        renderPlaylists(); // Assuming you have a renderPlaylists() function to update the sidebar
    });

   ipcRenderer.on('playlist-deleted', (event, playlistId) => {
        ipcRenderer.send('load-playlists'); // Reload playlists from DB to ensure sidebar updates
    });

    function load() {
       // Load playlists
       ipcRenderer.send('load-playlists');
    }
     load();
});