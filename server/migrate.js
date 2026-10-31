const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    console.log('Connecting to MySQL...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        port: Number(process.env.DB_PORT) || 3306,
        multipleStatements: true
    });

    try {
        const dbName = process.env.DB_NAME || 'subscription';
        console.log(`Setting up database ${dbName}...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`; USE \`${dbName}\`;`);

        // Roles
        await connection.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        // Users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                role_id INT NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (role_id) REFERENCES roles(id)
            );
        `);

        // Add is_active if missing
        try {
            await connection.query(`ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE`);
        } catch (e) {}

        // Password reset tokens
        await connection.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                token_hash CHAR(64) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Customers
        await connection.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                email VARCHAR(150) UNIQUE,
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Products
        await connection.query(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                price DECIMAL(12,2) NOT NULL,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Plans
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                price DECIMAL(12,2) NOT NULL,
                billing_cycle ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Modify billing_cycle if daily/weekly missing
        try {
            await connection.query(`ALTER TABLE plans MODIFY COLUMN billing_cycle ENUM('daily','weekly','monthly','quarterly','yearly') NOT NULL`);
        } catch (e) {}

        // Plan Products
        await connection.query(`
            CREATE TABLE IF NOT EXISTS plan_products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_id INT NOT NULL,
                product_id INT NOT NULL,
                FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                UNIQUE (plan_id, product_id)
            );
        `);

        // Taxes
        await connection.query(`
            CREATE TABLE IF NOT EXISTS taxes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                rate DECIMAL(5,2) NOT NULL,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Discounts
        await connection.query(`
            CREATE TABLE IF NOT EXISTS discounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                discount_type ENUM('percentage','fixed') NOT NULL,
                value DECIMAL(12,2) NOT NULL,
                min_purchase DECIMAL(12,2) DEFAULT 0,
                min_quantity INT DEFAULT 0,
                status ENUM('active','inactive') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Quotation Templates
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quotation_templates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(150) NOT NULL,
                description TEXT,
                validity_days INT DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // Quotation Template Lines
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quotation_template_lines (
                id INT AUTO_INCREMENT PRIMARY KEY,
                template_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(12,2) NOT NULL,
                FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            );
        `);

        // Subscriptions
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscriptions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subscription_number VARCHAR(50) NULL UNIQUE,
                customer_id INT NOT NULL,
                plan_id INT NOT NULL,
                template_id INT NULL,
                start_date DATE NOT NULL,
                end_date DATE NULL,
                next_billing_date DATE NULL,
                status ENUM('draft','quotation','confirmed','active','pending','cancelled','expired','closed') DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (plan_id) REFERENCES plans(id),
                FOREIGN KEY (template_id) REFERENCES quotation_templates(id) ON DELETE SET NULL,
                INDEX idx_subscription_status (status)
            );
        `);

        try {
            await connection.query(`ALTER TABLE subscriptions ADD COLUMN subscription_number VARCHAR(50) NULL UNIQUE`);
        } catch (e) {}
        try {
            await connection.query(`ALTER TABLE subscriptions ADD COLUMN template_id INT NULL`);
        } catch (e) {}
        try {
            await connection.query(`ALTER TABLE subscriptions ADD COLUMN next_billing_date DATE NULL`);
        } catch (e) {}
        try {
            await connection.query(`ALTER TABLE subscriptions MODIFY COLUMN status ENUM('draft','quotation','confirmed','active','pending','cancelled','expired','closed') DEFAULT 'draft'`);
        } catch (e) {}

        // Subscription Items
        await connection.query(`
            CREATE TABLE IF NOT EXISTS subscription_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                subscription_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT DEFAULT 1,
                unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );
        `);

        // Invoices
        await connection.query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id INT AUTO_INCREMENT PRIMARY KEY,
                customer_id INT NOT NULL,
                subscription_id INT NULL,
                invoice_number VARCHAR(50) NOT NULL UNIQUE,
                invoice_date DATE NOT NULL,
                due_date DATE NOT NULL,
                subtotal DECIMAL(12,2) NOT NULL,
                tax_amount DECIMAL(12,2) DEFAULT 0.00,
                discount_amount DECIMAL(12,2) DEFAULT 0.00,
                total_amount DECIMAL(12,2) NOT NULL,
                paid_amount DECIMAL(12,2) DEFAULT 0.00,
                outstanding_amount DECIMAL(12,2) NOT NULL,
                status ENUM('draft','confirmed','partially_paid','paid','cancelled','pending') DEFAULT 'draft',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
                INDEX idx_invoice_due_status (due_date, status)
            );
        `);

        try {
            await connection.query(`ALTER TABLE invoices MODIFY COLUMN status ENUM('draft','confirmed','partially_paid','paid','cancelled','pending') DEFAULT 'draft'`);
        } catch (e) {}

        // Invoice Items
        await connection.query(`
            CREATE TABLE IF NOT EXISTS invoice_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                product_id INT NULL,
                description VARCHAR(255) NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                unit_price DECIMAL(12,2) NOT NULL,
                line_total DECIMAL(12,2) NOT NULL,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
            );
        `);

        // Payment Methods
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_methods (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE
            );
        `);

        // Payments
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                invoice_id INT NOT NULL,
                payment_method_id INT NULL,
                amount DECIMAL(12,2) NOT NULL,
                payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                note TEXT,
                FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
                FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
                INDEX idx_payment_invoice (invoice_id)
            );
        `);

        // Insert Default Roles and Payment Methods
        await connection.query(`
            INSERT IGNORE INTO roles (name) VALUES 
            ('admin'), ('staff'), ('customer'), ('Admin'), ('Manager'), ('User');
        `);

        await connection.query(`
            INSERT IGNORE INTO payment_methods (name) VALUES 
            ('Cash'), ('Card'), ('Bank Transfer'), ('Online'), ('UPI');
        `);

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration error:', err);
        throw err;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    migrate()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = migrate;

