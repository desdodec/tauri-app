// db.js
const { Client } = require('pg');

const client = new Client({
  user: 'postgres',       // Replace with your PostgreSQL username
  host: 'localhost',       // Or your database host
  database: 'music_db',   // Or your database name
  password: 'b26xxx3',   // Replace with your PostgreSQL password
  port: 5432,             // Or your database port if it's not the default
});

client.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => console.error('Error connecting to PostgreSQL', err));

module.exports = client;  // Export the client object