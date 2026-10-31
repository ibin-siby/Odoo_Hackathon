const pool = require('./config/db');

async function seedDatabase() {
try {
await pool.query(`             INSERT IGNORE INTO roles (name)
            VALUES ('Admin'), ('Manager'), ('User')
        `);

    await pool.query(`
        INSERT IGNORE INTO payment_methods (name)
        VALUES ('Cash'), ('Card'), ('Bank Transfer'), ('Online')
    `);

    console.log('Initial database data inserted successfully!');
} catch (error) {
    console.error('Seeding failed:', error.message);
} finally {
    await pool.end();
}

}

seedDatabase();
