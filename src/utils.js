// utils.js
import { pageInfoSpan, totalRecordsDiv } from './elements.js';
import { getState } from './state.js';

/**
 * Formats duration in seconds to MM:SS format
 * @param {number} totalSeconds - Total seconds to format
 * @returns {string} Formatted duration string
 */
export function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Updates pagination information in the UI
 * Uses the current state to display pagination details
 * @param {number} total - Total number of records
 * @param {number} currentPage - Current page number
 */
export function updatePaginationInfo(total, currentPage) {
    const { recordsPerPage } = getState();
    const totalPages = Math.max(1, Math.ceil(total / recordsPerPage));
    
    // Ensure current page doesn't exceed total pages
    const adjustedCurrentPage = Math.min(currentPage, totalPages);
    
    // Update UI elements
    pageInfoSpan.textContent = `Page ${adjustedCurrentPage} of ${totalPages}`;
    totalRecordsDiv.textContent = `Total Records: ${total}`;
    
    console.log('Pagination info updated:', {
        total,
        currentPage: adjustedCurrentPage,
        totalPages,
        recordsPerPage
    });
}

/**
 * Creates a debounced version of a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Safely parses JSON with error handling
 * @param {string} json - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed object or default value
 */
export function safeJSONParse(json, defaultValue = null) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.error('JSON Parse Error:', error);
        return defaultValue;
    }
}

/**
 * Creates a throttled version of a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds to wait between executions
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Formats a date string to a localized format
 * @param {string} dateString - Date string to format
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date Format Error:', error);
        return dateString;
    }
}

/**
 * Generates a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Checks if a value is empty (null, undefined, empty string, empty array, or empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty, false otherwise
 */
export function isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}