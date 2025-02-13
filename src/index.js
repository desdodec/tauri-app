// src/index.js
import * as elements from './elements.js';
import { initializeState, subscribe, updateState } from './state.js';
import * as api from './api.js';
import * as render from './render.js';
import * as events from './events.js';
import { performSearch } from './search.js';
import { loadPlaylists } from './playlist.js';
import * as utils from './utils.js';

// Initialize application
async function initializeApp() {
    try {
        // Initialize state first
        initializeState();
        
        // Set up state change subscription for debugging
        // Instead of checking process.env, we'll use a debug flag
        const isDebugMode = window.location.hostname === 'localhost';
        if (isDebugMode) {
            subscribe((state) => {
                console.log('State updated:', state);
            });
        }

        // Set up error handling subscription
        subscribe((state) => {
            if (state.error) {
                console.error('Application Error:', state.error);
                // You might want to show an error UI component here
            }
        });

        // Load initial data
        updateState({ isLoading: true });
        
        try {
            await loadPlaylists();
        } catch (error) {
            console.error('Failed to load playlists:', error);
            updateState({
                error: {
                    message: 'Failed to load playlists',
                    details: error.message
                }
            });
        }

        // Clear all search inputs and initialize empty state
        elements.searchBox.value = '';
        elements.dropdownInput.value = '';
        elements.dropdownColumn.value = 'id'; // Reset to default option
        
        updateState({
            initialLoad: true,
            isLoading: false,
            lastSearchTerm: '',
            activeFilter: 'all'
        });
        
        await performSearch();

    } catch (error) {
        console.error('Application initialization failed:', error);
        updateState({
            error: {
                message: 'Failed to initialize application',
                details: error.message
            },
            isLoading: false
        });
    }
}

// Start the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp().catch(error => {
        console.error('Critical initialization error:', error);
        // Show critical error UI
        document.body.innerHTML = `
            <div class="critical-error">
                <h1>Application Error</h1>
                <p>Failed to start the application. Please try refreshing the page.</p>
                <pre>${error.message}</pre>
                <button onclick="window.location.reload()">Refresh Page</button>
            </div>
        `;
    });
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    updateState({
        error: {
            message: 'Unexpected error occurred',
            details: event.reason.message
        }
    });
});

// Handle global errors
window.addEventListener('error', (event) => {
    console.error('Global Error:', event.error);
    updateState({
        error: {
            message: 'Unexpected error occurred',
            details: event.error.message
        }
    });
});