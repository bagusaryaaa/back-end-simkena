const { Client } = require('pg');
require('dotenv').config();

async function checkSettings() {
    const client = new Client({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME
    });

    try {
        await client.connect();
        const res = await client.query('SELECT * FROM settings');
        console.log('--- Current Settings in DB ---');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkSettings();
