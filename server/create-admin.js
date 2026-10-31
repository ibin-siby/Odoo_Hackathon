require('dotenv').config();

const bcrypt = require('bcrypt');
const readline = require('readline');
const { pool } = require('./db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise(resolve => {
        rl.question(question, resolve);
    });
}

async function createAdmin() {
    try {
        console.log('\n=== Brightloop Admin Setup ===\n');

        const name = await ask('Admin name: ');
        const email = await ask('Admin email: ');
        const password = await ask('Admin password (minimum 9 characters): ');

        if (!name.trim() || !email.trim() || password.length < 9) {
            console.log('Invalid details. Password must be at least 9 characters.');
            return;
        }

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email.trim()]
        );

        if (existing.length > 0) {
            console.log('This email is already registered.');
            return;
        }

        const [roles] = await pool.query(
            'SELECT id FROM roles WHERE name = ?',
            ['admin']
        );

        if (roles.length === 0) {
            console.log('Admin role not found in roles table.');
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `INSERT INTO users (role_id, name, email, password)
             VALUES (?, ?, ?, ?)`,
            [roles[0].id, name.trim(), email.trim(), passwordHash]
        );

        console.log('\nAdmin account created successfully!');

    } catch (error) {
        console.error('Admin creation failed:', error.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();