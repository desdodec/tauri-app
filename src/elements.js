// src/elements.js

export const searchBox = document.getElementById('searchBox');
export const searchButton = document.getElementById('searchButton');
export const clearButton = document.getElementById('clearButton');
export const filterButtons = document.querySelectorAll('.filter-btn');
export const dropdownColumn = document.getElementById('dropdownColumn');
export const dropdownInput = document.getElementById('dropdownInput');
export const resultsDiv = document.getElementById('results');
export const totalRecordsDiv = document.getElementById('totalRecords');
export const firstPageButton = document.getElementById('firstPage');
export const prevPageButton = document.getElementById('prevPage');
export const pageInfoSpan = document.getElementById('pageInfo');
export const nextPageButton = document.getElementById('nextPage');
export const lastPageButton = document.getElementById('lastPage');
export const playlistsDiv = document.getElementById("playlists");

// Create Playlist Modal
export const createPlaylistModal = document.getElementById("playlistModal");
export const createPlaylistBtn = document.getElementById("createPlaylistBtn");
export const confirmBtn = document.getElementById("confirmBtn");
export const cancelBtn = document.getElementById("cancelBtn");
export const playlistNameInput = document.getElementById("playlistName");
export const closePlaylistBtn = document.querySelector(".close");

// Add to Playlist Modal
export const addToPlaylistModal = document.getElementById("addToPlaylistModal");
export const playlistsList = document.getElementById("playlistsList");
export const createNewPlaylistBtn = document.getElementById("createNewPlaylistBtn");
export const cancelAddToPlaylistBtn = document.getElementById("cancelAddToPlaylistBtn");
export const closeAddPlaylistBtn = document.querySelector(".close-add-playlist");