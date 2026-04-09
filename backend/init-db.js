const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function connectDB() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL Railway');
    } catch (err) {
        console.error('Database connection error:', err);
    }
}

connectDB();

module.exports = client;
