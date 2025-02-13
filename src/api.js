// api.js
import { safeJSONParse } from './utils.js';

const API_CONFIG = {
    BASE_URL: 'http://localhost:3000',
    TIMEOUT: 5000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Custom error class for API errors
class APIError extends Error {
    constructor(message, status, details = null) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.details = details;
    }
}

// Request timeout promise
const timeoutPromise = (ms) => new Promise((_, reject) => {
    setTimeout(() => reject(new APIError('Request timeout', 408)), ms);
});

// Retry logic
async function retryOperation(operation, retryCount = API_CONFIG.RETRY_ATTEMPTS) {
    for (let i = 0; i < retryCount; i++) {
        try {
            return await operation();
        } catch (error) {
            if (i === retryCount - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (i + 1)));
        }
    }
}

// Base fetch function with timeout and error handling
async function fetchWithTimeout(url, options = {}) {
    const response = await Promise.race([
        fetch(url, options),
        timeoutPromise(API_CONFIG.TIMEOUT)
    ]);

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new APIError(
            errorData.message || `HTTP error! Status: ${response.status}`,
            response.status,
            errorData
        );
    }

    return response;
}

// Cache management
function getCacheKey(url, options = {}) {
    return `${options.method || 'GET'}-${url}-${JSON.stringify(options.body || {})}`;
}

function getFromCache(cacheKey) {
    if (cache.has(cacheKey)) {
        const { data, timestamp } = cache.get(cacheKey);
        if (Date.now() - timestamp < CACHE_DURATION) {
            return data;
        }
        cache.delete(cacheKey);
    }
    return null;
}

function setCache(cacheKey, data) {
    cache.set(cacheKey, {
        data,
        timestamp: Date.now()
    });
}

// API request functions
export async function performSearchRequest(searchTerm, filter, dropdownColumnValue, dropdownInputValue, currentPage, recordsPerPage) {
    console.log('API Request Parameters:', {
        searchTerm,
        filter,
        dropdownColumnValue,
        dropdownInputValue,
        currentPage,
        recordsPerPage
    });

    const queryParams = new URLSearchParams();
    const trimmedDropdownValue = dropdownInputValue ? dropdownInputValue.trim() : '';
    
    // Add pagination parameters
    queryParams.append('page', currentPage.toString());
    queryParams.append('limit', recordsPerPage.toString());
    
    // Add filter if not 'all'
    if (filter !== 'all') {
        queryParams.append('filter', filter);
    }
    
    // Add main search term if provided
    if (searchTerm && searchTerm.trim()) {
        queryParams.append('term', searchTerm.trim());
        console.log('Using main search:', { term: searchTerm.trim() });
    }

    // Add dropdown search if provided
    if (trimmedDropdownValue) {
        queryParams.append('dropdownColumn', dropdownColumnValue);
        queryParams.append('dropdownValue', trimmedDropdownValue);
        console.log('Using dropdown search:', {
            column: dropdownColumnValue,
            value: trimmedDropdownValue
        });
    }

    console.log('Final API Request:', {
        url: `${API_CONFIG.BASE_URL}/search`,
        params: Object.fromEntries(queryParams.entries())
    });

    const url = `${API_CONFIG.BASE_URL}/search?${queryParams}`;
    const cacheKey = getCacheKey(url);
    const cachedData = getFromCache(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    const response = await retryOperation(() => fetchWithTimeout(url));
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
}

export async function loadPlaylistsRequest() {
    const url = `${API_CONFIG.BASE_URL}/playlists`;
    const cacheKey = getCacheKey(url);
    const cachedData = getFromCache(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    const response = await retryOperation(() => fetchWithTimeout(url));
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
}

export async function deletePlaylistRequest(playlistId) {
    const url = `${API_CONFIG.BASE_URL}/playlists/${playlistId}`;
    await retryOperation(() => 
        fetchWithTimeout(url, { method: 'DELETE' })
    );
    // Clear related caches
    const playlistsCacheKey = getCacheKey(`${API_CONFIG.BASE_URL}/playlists`);
    cache.delete(playlistsCacheKey);
}

export async function addTrackToPlaylistRequest(playlistId, trackId) {
    const url = `${API_CONFIG.BASE_URL}/playlist-tracks/${playlistId}`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trackId })
    };

    const response = await retryOperation(() => fetchWithTimeout(url, options));
    const data = await response.json();
    
    // Clear playlists cache
    const playlistsCacheKey = getCacheKey(`${API_CONFIG.BASE_URL}/playlists`);
    cache.delete(playlistsCacheKey);
    
    return data;
}

export async function createPlaylistRequest(playlistName) {
    const url = `${API_CONFIG.BASE_URL}/playlists`;
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: playlistName })
    };

    const response = await retryOperation(() => fetchWithTimeout(url, options));
    const data = await response.json();
    
    // Clear playlists cache
    const playlistsCacheKey = getCacheKey(`${API_CONFIG.BASE_URL}/playlists`);
    cache.delete(playlistsCacheKey);
    
    return data;
}

export async function loadPlaylistTracksRequest(playlistId) {
    const url = `${API_CONFIG.BASE_URL}/playlist-tracks/${playlistId}`;
    const cacheKey = getCacheKey(url);
    const cachedData = getFromCache(cacheKey);

    if (cachedData) {
        return cachedData;
    }

    const response = await retryOperation(() => fetchWithTimeout(url));
    const data = await response.json();
    setCache(cacheKey, data);
    return data;
}

export async function removeTrackFromPlaylistRequest(playlistTrackId) {
    const url = `${API_CONFIG.BASE_URL}/playlist-tracks/${playlistTrackId}`;
    await retryOperation(() => 
        fetchWithTimeout(url, { method: 'DELETE' })
    );
    
    // Clear related caches
    cache.clear(); // Since this could affect multiple playlists, clear all cache
}

// Export cache management functions for testing
export const _testing = {
    clearCache: () => cache.clear(),
    getCacheSize: () => cache.size
};