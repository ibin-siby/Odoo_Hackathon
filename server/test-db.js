const pool = require('./config/db');

async function testConnection() {
let connection;

try {
    connection = await pool.getConnection();

    console.log('SUCCESS: Connected to MySQL!');

    const [rows] = await connection.query(
        'SELECT DATABASE() AS databaseName'
    );

    console.log('Database:', rows[0].databaseName);

} catch (error) {
    console.error('MySQL connection failed:', error.message);

} finally {
    if (connection) {
        connection.release();
    }

    await pool.end();
}

}

testConnection();
