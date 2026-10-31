const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'subscription',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL database connected successfully!');
        connection.release();
        return true;
    } catch (error) {
        console.error('MySQL connection failed:', error.message);
        return false;
    }
}

const db = {
    pool,
    testConnection,
    query: (...args) => pool.query(...args),
    execute: (...args) => pool.execute(...args),
    getConnection: (...args) => pool.getConnection(...args),
    end: (...args) => pool.end(...args)
};

module.exports = db;
