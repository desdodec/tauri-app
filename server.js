const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const client = require('./db'); // Import the database connection
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, './')));

// Root endpoint serves the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Endpoints:

// GET /playlists - Load playlists
app.get('/playlists', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM playlists ORDER BY created_at DESC');
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
        const result = await client.query(
            'INSERT INTO playlists (name) VALUES ($1) RETURNING *',
            [name]
        );
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
        await client.query('DELETE FROM playlists WHERE id = $1', [playlistId]);
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
        const query = `
            SELECT
                pt.id AS playlist_track_id,  -- Unique ID for the playlist_tracks entry
                t.*                           -- All columns from the tracks table
            FROM playlist_tracks pt
            JOIN tracks t ON pt.track_id = t.id
            WHERE pt.playlist_id = $1
            ORDER BY pt.id ASC;  -- Order by the order they were added
        `;
        const result = await client.query(query, [playlistId]);
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
        // Verify that the track exists
        const trackCheckResult = await client.query('SELECT id FROM tracks WHERE id = $1', [trackId]);
        if (trackCheckResult.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const query = `
            INSERT INTO playlist_tracks (playlist_id, track_id)
            VALUES ($1, $2)
            RETURNING id;
        `;
        const result = await client.query(query, [playlistId, trackId]);
        res.status(201).json({ message: 'Track added to playlist successfully', playlist_track_id: result.rows[0].id }); // Return the id of the new entry
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
        const query = 'DELETE FROM playlist_tracks WHERE id = $1';
        await client.query(query, [playlistTrackId]);
        res.json({ message: 'Track removed from playlist successfully' });
    } catch (err) {
        console.error('Error removing track from playlist:', err);
        res.status(500).json({ error: 'Failed to remove track from playlist' });
    }
});

// Function to format the SQL query with parameters
function formatSqlQuery(query, values) {
    let formattedQuery = query;
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        // Escape single quotes
        const escapedValue = typeof value === 'string' ? value.replace(/'/g, "''") : value;

        // Handle different data types
        let formattedValue;
        if (typeof value === 'string') {
            formattedValue = `'${escapedValue}'`;
        } else if (value === null) {
            formattedValue = 'NULL';
        } else {
            formattedValue = value;
        }

        // Replace the placeholder ($1, $2, etc.) with the value
        formattedQuery = formattedQuery.replace(new RegExp(`\\$${i + 1}`, 'g'), formattedValue);
    }
    return formattedQuery;
}

// GET /search - Search for tracks
app.get('/search', async (req, res) => {
    const { term: searchTerm, filter, dropdownColumn, dropdownValue, page = 1, limit = 10 } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const offset = (pageNumber - 1) * limitNumber;

    let query, countQuery;
    let whereClauses = [];
    let queryValues = []; // Array to hold query values
    let countQueryValues = [];

    // Constructing the base query
    if (searchTerm && searchTerm.trim()) {
        const escapedSearchTerm = searchTerm.replace(/'/g, "''"); // Escape single quotes
        query = `SELECT * FROM search_tracks_sql($1)`;
        countQuery = `SELECT COUNT(*) FROM search_tracks_sql($1)`;
        queryValues.push(escapedSearchTerm);
        countQueryValues.push(escapedSearchTerm);

    } else {
        query = `SELECT * FROM tracks_search`;
        countQuery = `SELECT COUNT(*) FROM tracks_search`;
    }

    // Apply global filters
    if (filter === 'vocal') {
        whereClauses.push('vocal = 1');
    } else if (filter === 'solo') {
        whereClauses.push('solo = 1');
    } else if (filter === 'instrumental') {
        whereClauses.push('vocal = 0');  // Assuming instrumental means non-vocal
    }

    // Apply dropdown filter
    if (dropdownValue && dropdownValue.trim()) {
        const escapedDropdownValue = dropdownValue.replace(/'/g, "''"); // Escape single quotes
        whereClauses.push(`${dropdownColumn} ILIKE '%${escapedDropdownValue}%'`);
    }

    // Combine WHERE clauses if any
    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Apply sorting
    query += ' ORDER BY released_at DESC, id ASC';

    // Apply pagination using LIMIT and OFFSET
    query += ` LIMIT ${limitNumber} OFFSET ${offset};`;

    const formattedQuery = formatSqlQuery(query, queryValues);
    console.log('Formatted Query:', formattedQuery);

    const formattedCountQuery = formatSqlQuery(countQuery, countQueryValues);
    console.log('Formatted Count Query:', formattedCountQuery);

    try {
        const result = await client.query(query, queryValues);
        const countResult = await client.query(countQuery, countQueryValues);
        const totalRecords = parseInt(countResult.rows[0].count, 10);

        // Make the paths here to avoid the path import in the front end, and make it clean.
        const tracks = result.rows.map(track => {
            console.log("Track data BEFORE constructPaths: ", track);
            const { albumCoverPath, audioPath, waveformBasePath, waveformOverPath } = constructPaths(track);
            console.log("Track data AFTER constructPaths: ",  albumCoverPath, audioPath, waveformBasePath, waveformOverPath );

            return {
                ...track,
                albumCoverPath,
                audioPath,
                waveformBasePath,
                waveformOverPath
            };
        });

        res.json({ results: tracks, total: totalRecords });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'Failed to search tracks' });
    }
});

// ----------------------------------------------------------------------------
// Functions for constucting the paths
// ----------------------------------------------------------------------------
function constructPaths(track) {
    const albumCoverPath = track.library && track.id
        ? `data/artwork/${track.library}/${track.id.split('_')[0]}.jpg`
        : 'default_album_cover.png';

    const audioPath = track.library && track.filename
        ? `data/audio/mp3s/${track.library}/${track.id.split('_')[0]} ${track.cd_title}/${track.filename}.mp3`
        : '';

    return { albumCoverPath, audioPath };
}

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});