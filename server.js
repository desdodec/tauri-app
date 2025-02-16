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
            ORDER BY pt.id ASC
            LIMIT $2 OFFSET $3;
        `;
        
        const countQuery = `
            SELECT COUNT(*)
            FROM playlist_tracks
            WHERE playlist_id = $1
        `;

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const offset = (page - 1) * limit;

        const [tracksResult, countResult] = await Promise.all([
            client.query(query, [playlistId, limit, offset]),
            client.query(countQuery, [playlistId])
        ]);

        console.log(`Found ${countResult.rows[0].count} total tracks for playlist ${playlistId}`);
        console.log(`Returning ${tracksResult.rows.length} tracks for page ${page}`);

        // Add paths to each track
        const tracks = tracksResult.rows.map(track => {
            const { albumCoverPath, audioPath } = constructPaths(track);
            return {
                ...track,
                albumCoverPath,
                audioPath
            };
        });

        res.json({
            tracks,
            total: parseInt(countResult.rows[0].count, 10),
            page,
            limit
        });
    } catch (err) {
        console.error('Error loading playlist tracks:', err);
        res.status(500).json({ error: 'Failed to load playlist tracks' });
    }
});

// Test endpoint for debugging
app.post('/playlist-tracks/:playlistId/album/test', async (req, res) => {
    console.log('Test endpoint hit:', {
        params: req.params,
        body: req.body
    });
    res.json({ message: 'Test endpoint working' });
});

// GET /album-tracks/:catalogueNo - Get all tracks from an album
app.get('/album-tracks/:catalogueNo', async (req, res) => {
    const { catalogueNo } = req.params;
    
    if (!catalogueNo) {
        return res.status(400).json({ error: 'Catalogue number is required' });
    }

    try {
        console.log('Getting tracks for album:', catalogueNo);
        const query = `
            SELECT *
            FROM tracks_search
            WHERE id ILIKE $1
            ORDER BY id ASC
        `;
        const result = await client.query(query, [`${catalogueNo}%`]);
        console.log(`Found ${result.rows.length} tracks for album ${catalogueNo}`);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting album tracks:', err);
        res.status(500).json({ error: 'Failed to get album tracks' });
    }
});

// POST /playlist-tracks/:playlistId/album - Add all tracks from an album to a playlist
app.post('/playlist-tracks/:playlistId/album', async (req, res) => {
    console.log('Received album add request:', {
        params: req.params,
        body: req.body,
        headers: req.headers
    });

    const playlistId = parseInt(req.params.playlistId, 10);
    const { catalogueNo } = req.body;

    console.log('Parsed request data:', {
        playlistId,
        catalogueNo,
        isValidPlaylistId: !isNaN(playlistId)
    });

    if (isNaN(playlistId)) {
        console.error('Invalid playlist ID:', {
            raw: req.params.playlistId,
            parsed: playlistId
        });
        return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    if (!catalogueNo) {
        console.error('Missing catalogue number in request body:', req.body);
        return res.status(400).json({ error: 'Catalogue number is required' });
    }

    try {
        // First verify the playlist exists
        const playlistQuery = 'SELECT id FROM playlists WHERE id = $1';
        const playlistResult = await client.query(playlistQuery, [playlistId]);
        
        if (playlistResult.rows.length === 0) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // First try a simple query to verify the tracks exist
        const verifyQuery = `
            SELECT COUNT(*) as count
            FROM tracks
            WHERE id ILIKE $1
        `;
        console.log('Verifying tracks exist:', {
            query: verifyQuery,
            catalogueNo: `${catalogueNo}%`
        });
        
        const verifyResult = await client.query(verifyQuery, [`${catalogueNo}%`]);
        const trackCount = parseInt(verifyResult.rows[0].count, 10);
        
        console.log('Track verification result:', {
            catalogueNo,
            trackCount,
            result: verifyResult.rows[0]
        });
        
        if (trackCount === 0) {
            console.error('No tracks found in tracks table:', catalogueNo);
            return res.status(404).json({ error: 'No tracks found for this album' });
        }
        
        // If tracks exist, get the full details
        const tracksQuery = `
            SELECT id, title, library, cd_title, filename, duration
            FROM tracks
            WHERE id ILIKE $1
            ORDER BY id ASC
        `;
        console.log('Getting track details:', {
            query: tracksQuery,
            catalogueNo: `${catalogueNo}%`
        });
        
        const tracksResult = await client.query(tracksQuery, [`${catalogueNo}%`]);
        console.log('Album tracks query result:', {
            tracksFound: tracksResult.rows.length,
            firstTrack: tracksResult.rows[0],
            catalogueNo
        });
        
        if (tracksResult.rows.length === 0) {
            console.error('No tracks found for album:', catalogueNo);
            return res.status(404).json({ error: 'No tracks found for this album' });
        }

        // Insert all tracks into playlist_tracks
        const insertPromises = tracksResult.rows.map(track => {
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
                ON CONFLICT (playlist_id, track_id) DO NOTHING
                RETURNING id;
            `;
            
            return client.query(query, [
                playlistId,
                track.id,
                track.title,
                track.library,
                track.cd_title,
                track.filename,
                track.duration
            ]);
        });

        const results = await Promise.all(insertPromises);
        const addedTracks = results.filter(result => result.rows.length > 0);

        console.log(`Added ${addedTracks.length} tracks from album ${catalogueNo} to playlist ${playlistId}`);

        res.status(201).json({
            message: 'Album tracks added to playlist successfully',
            addedTracks: addedTracks.length,
            totalTracks: tracksResult.rows.length
        });
    } catch (err) {
        console.error('Error adding album to playlist:', err);
        res.status(500).json({
            error: 'Failed to add album tracks to playlist',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// POST /playlist-tracks/:playlistId - Add a track to a playlist
app.post('/playlist-tracks/:playlistId', async (req, res) => {
    const playlistId = parseInt(req.params.playlistId, 10);
    const { trackId } = req.body;

    console.log('Received request to add track to playlist:', {
        playlistId,
        trackId,
        body: req.body
    });

    if (isNaN(playlistId)) {
        console.error('Invalid playlist ID:', playlistId);
        return res.status(400).json({ error: 'Invalid playlist ID' });
    }

    if (!trackId) {
        console.error('No track ID provided in request body');
        return res.status(400).json({ error: 'Track ID is required' });
    }

    try {
        // First verify the playlist exists
        const playlistQuery = 'SELECT id FROM playlists WHERE id = $1';
        const playlistResult = await client.query(playlistQuery, [playlistId]);
        
        if (playlistResult.rows.length === 0) {
            console.error('Playlist not found:', playlistId);
            return res.status(404).json({ error: 'Playlist not found' });
        }

        console.log('Found playlist:', playlistResult.rows[0]);

        // Then get the track details
        const trackQuery = `
            SELECT id, title, library, cd_title, filename, duration
            FROM tracks
            WHERE id = $1;
        `;
        const trackResult = await client.query(trackQuery, [trackId]);
        
        if (trackResult.rows.length === 0) {
            console.error('Track not found:', trackId);
            return res.status(404).json({ error: 'Track not found' });
        }
        
        const track = trackResult.rows[0];
        console.log('Found track:', track);
        
        // Check if track is already in playlist
        const duplicateCheck = `
            SELECT id FROM playlist_tracks
            WHERE playlist_id = $1 AND track_id = $2
        `;
        const duplicateResult = await client.query(duplicateCheck, [playlistId, trackId]);
        
        if (duplicateResult.rows.length > 0) {
            console.error('Track already exists in playlist:', {
                playlistId,
                trackId
            });
            return res.status(400).json({ error: 'Track already exists in playlist' });
        }
        
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

        console.log('Track added successfully:', {
            playlistTrackId: result.rows[0].id,
            playlistId,
            trackId
        });

        res.status(201).json({
            message: 'Track added to playlist successfully',
            playlist_track_id: result.rows[0].id
        });
    } catch (err) {
        console.error('Database error adding track to playlist:', err);
        res.status(500).json({
            error: 'Failed to add track to playlist',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
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