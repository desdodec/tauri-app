const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const client = require('./db');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Add error logging middleware
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    res.status(500).json({
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, './')));

// Serve data directory files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Root endpoint serves the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// GET /playlists - Load playlists
app.get('/playlists', async (req, res) => {
    try {
        console.log('Loading playlists...');
        const result = await client.query('SELECT * FROM playlists ORDER BY created_at DESC');
        console.log('Playlists loaded:', result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error('Error loading playlists:', err);
        res.status(500).json({ error: 'Failed to load playlists' });
    }
});

// POST /playlists - Create a new playlist
app.post('/playlists', async (req, res) => {
    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Playlist name is required' });
    }
    try {
        console.log('Creating playlist:', name);
        const result = await client.query(
            'INSERT INTO playlists (name) VALUES ($1) RETURNING *',
            [name]
        );
        console.log('Playlist created:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error creating playlist:', err);
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

// DELETE /playlists/:id - Delete a playlist
app.delete('/playlists/:id', async (req, res) => {
    const playlistId = parseInt(req.params.id, 10);
    if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
    }
    try {
        console.log('Deleting playlist:', playlistId);
        await client.query('DELETE FROM playlists WHERE id = $1', [playlistId]);
        console.log('Playlist deleted successfully');
        res.json({ message: 'Playlist deleted successfully' });
    } catch (err) {
        console.error('Error deleting playlist:', err);
        res.status(500).json({ error: 'Failed to delete playlist' });
    }
});

// GET /playlist-tracks/:playlistId - Load tracks for a specific playlist
app.get('/playlist-tracks/:playlistId', async (req, res) => {
    const playlistId = parseInt(req.params.playlistId, 10);
    if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    try {
        console.log('Loading tracks for playlist:', playlistId);
        const query = `
            SELECT
                pt.id AS playlist_track_id,
                t.*
            FROM playlist_tracks pt
            JOIN tracks t ON pt.track_id = t.id
            WHERE pt.playlist_id = $1
            ORDER BY pt.id ASC;
        `;
        const result = await client.query(query, [playlistId]);
        console.log(`Found ${result.rows.length} tracks for playlist ${playlistId}`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error loading playlist tracks:', err);
        res.status(500).json({ error: 'Failed to load playlist tracks' });
    }
});

// POST /playlist-tracks/:playlistId - Add a track to a playlist
app.post('/playlist-tracks/:playlistId', async (req, res) => {
    const playlistId = parseInt(req.params.playlistId, 10);
    const { trackId } = req.body;

    if (isNaN(playlistId)) {
        return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    if (!trackId) {
        return res.status(400).json({ error: 'Track ID is required' });
    }

    try {
        console.log('Adding track to playlist:', { playlistId, trackId });
        // First get the track details
        const trackQuery = `
            SELECT id, title, library, cd_title, filename, duration
            FROM tracks
            WHERE id = $1;
        `;
        const trackResult = await client.query(trackQuery, [trackId]);
        
        if (trackResult.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }
        
        const track = trackResult.rows[0];
        
        // Then insert into playlist_tracks with all details
        const query = `
            INSERT INTO playlist_tracks (
                playlist_id,
                track_id,
                title,
                library,
                cd_title,
                filename,
                duration
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id;
        `;
        
        const result = await client.query(query, [
            playlistId,
            trackId,
            track.title,
            track.library,
            track.cd_title,
            track.filename,
            track.duration
        ]);
        console.log('Track added successfully:', result.rows[0]);
        res.status(201).json({ 
            message: 'Track added to playlist successfully', 
            playlist_track_id: result.rows[0].id 
        });
    } catch (err) {
        console.error('Error adding track to playlist:', err);
        res.status(500).json({ error: 'Failed to add track to playlist' });
    }
});

// DELETE /playlist-tracks/:playlistTrackId - Delete a track from a playlist
app.delete('/playlist-tracks/:playlistTrackId', async (req, res) => {
    const playlistTrackId = parseInt(req.params.playlistTrackId, 10);

    if (isNaN(playlistTrackId)) {
        return res.status(400).json({ error: 'Invalid playlist_track ID' });
    }

    try {
        console.log('Removing track from playlist:', playlistTrackId);
        const query = 'DELETE FROM playlist_tracks WHERE id = $1';
        await client.query(query, [playlistTrackId]);
        console.log('Track removed successfully');
        res.json({ message: 'Track removed from playlist successfully' });
    } catch (err) {
        console.error('Error removing track from playlist:', err);
        res.status(500).json({ error: 'Failed to remove track from playlist' });
    }
});

// GET /search - Search for tracks
app.get('/search', async (req, res) => {
    console.log('Search request received:', {
        query: req.query,
        term: req.query.term,
        filter: req.query.filter,
        dropdownColumn: req.query.dropdownColumn,
        dropdownValue: req.query.dropdownValue,
        page: req.query.page,
        limit: req.query.limit
    });
    
    const { term: searchTerm, filter, dropdownColumn, dropdownValue, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    let query, countQuery;
    let queryValues = [];
    let countQueryValues = [];

    try {
        // Start building the query
        let paramIndex = 1;
        let whereConditions = [];
        let baseTable;

        // Start with search_tracks_sql if there's a main search term
        if (searchTerm && searchTerm.trim()) {
            console.log('Processing main search:', { term: searchTerm.trim() });
            baseTable = `(SELECT * FROM search_tracks_sql($${paramIndex})) AS search_results`;
            queryValues.push(searchTerm.trim());
            countQueryValues.push(searchTerm.trim());
            paramIndex++;
        } else {
            // If no main search, use tracks_search view
            baseTable = 'tracks_search';
        }

        query = `SELECT * FROM ${baseTable}`;
        countQuery = `SELECT COUNT(*) FROM ${baseTable}`;

        // Handle dropdown search (simplified)
        if (dropdownValue && dropdownValue.trim() && dropdownColumn) {
            console.log('Processing dropdown search:', {
                column: dropdownColumn,
                value: dropdownValue.trim()
            });
            whereConditions.push(`${dropdownColumn} ILIKE '%${dropdownValue.trim()}%'`);
        }

        // Apply filter conditions (simplified)
        if (filter === 'vocal') {
            whereConditions.push('vocal = 1');
        } else if (filter === 'solo') {
            whereConditions.push('solo = 1');
        } else if (filter === 'instrumental') {
            whereConditions.push('vocal = 0');
        }

        console.log('Search criteria:', {
            mainSearch: searchTerm ? searchTerm.trim() : null,
            dropdown: dropdownValue ? {
                column: dropdownColumn,
                value: dropdownValue.trim()
            } : null,
            filter,
            conditions: whereConditions
        });

        console.log('Search configuration:', {
            type: searchTerm ? 'full-text' : 'direct',
            mainSearch: searchTerm ? { term: searchTerm.trim() } : null,
            dropdown: dropdownValue ? {
                column: dropdownColumn,
                value: dropdownValue.trim()
            } : null,
            filter,
            conditions: whereConditions
        });

        console.log('Final search configuration:', {
            type: dropdownValue && dropdownValue.trim() ? 'dropdown' : 'main',
            conditions: whereConditions,
            values: queryValues
        });

        // Add WHERE clause and conditions
        if (whereConditions.length > 0) {
            const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
            query += whereClause;
            countQuery += whereClause;
        }

        // Add sorting and pagination only to the main query
        query += ' ORDER BY released_at DESC, id ASC';
        query += ` LIMIT ${limitNumber} OFFSET ${offset}`;

        console.log('Final query configuration:', {
            baseTable,
            conditions: whereConditions,
            parameters: queryValues,
            pagination: { limit: limitNumber, offset }
        });

        // Log the exact SQL query that will be sent to the database
        let finalQuery = query;
        if (whereConditions.length > 0) {
            finalQuery += ' WHERE ' + whereConditions.join(' AND ');
        }
        finalQuery += ' ORDER BY released_at DESC, id ASC';
        finalQuery += ` LIMIT ${limitNumber} OFFSET ${offset}`;

        // Replace $1, $2, etc. with actual values for logging
        let debugQuery = finalQuery;
        queryValues.forEach((value, index) => {
            debugQuery = debugQuery.replace(`$${index + 1}`, `'${value}'`);
        });

        console.log('\n=== Search Query Debug ===');
        console.log('Search Parameters:', {
            mainSearch: searchTerm || 'none',
            dropdown: dropdownValue ? `${dropdownColumn}='${dropdownValue}'` : 'none',
            filter: filter || 'all',
            page: pageNumber,
            limit: limitNumber
        });
        console.log('\nConstructed SQL Query:');
        console.log(debugQuery);
        console.log('\nQuery Values:', queryValues);
        console.log('=========================\n');

        // Execute the queries
        console.log('Executing queries with values:', {
            query,
            countQuery,
            queryValues,
            countQueryValues
        });

        const [result, countResult] = await Promise.all([
            client.query(query, queryValues),
            client.query(countQuery, countQueryValues)
        ]);

        const totalRecords = parseInt(countResult.rows[0].count, 10);

        // Log query performance
        console.log('Query performance:', {
            totalRecords,
            returnedRecords: result.rows.length,
            hasMorePages: totalRecords > (pageNumber * limitNumber),
            estimateUsed: totalRecords > 1000
        });

        console.log(`Found ${totalRecords} total records`);
        console.log(`Returning ${result.rows.length} records for current page`);

        // Make the paths here to avoid the path import in the front end
        const tracks = result.rows.map(track => {
            const { albumCoverPath, audioPath } = constructPaths(track);
            return {
                ...track,
                albumCoverPath,
                audioPath
            };
        });

        res.json({ results: tracks, total: totalRecords });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ 
            error: 'Failed to search tracks',
            details: err.message
        });
    }
});

// Functions for constructing the paths
function constructPaths(track) {
    const albumCoverPath = track.library && track.id
        ? `data/artwork/${track.library}/${track.id.split('_')[0]}.jpg`
        : 'data/artwork/placeholder.jpg';

    const audioPath = track.library && track.filename
        ? `data/audio/mp3s/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.mp3`
        : '';

    return { albumCoverPath, audioPath };
}

// Start the server
const server = app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

// Handle server errors
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please choose a different port or stop the other process.`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});