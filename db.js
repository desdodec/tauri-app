// db.js
const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'music_db',
    password: 'b26xxx3',
    port: 5432,
});

client.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => {
        console.error('Error connecting to PostgreSQL:', err);
        process.exit(1);
    });

module.exports = client;