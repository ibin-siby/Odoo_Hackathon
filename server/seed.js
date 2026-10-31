const bcrypt = require('bcrypt');
const pool = require('./db');

async function seedDatabase() {
    console.log('Seeding Brightloop database with demo records...');
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Roles
        console.log('1. Seeding roles...');
        await connection.query(`
            INSERT IGNORE INTO roles (name) VALUES 
            ('admin'), ('staff'), ('customer'), ('Admin'), ('Manager'), ('User');
        `);

        const [adminRole] = await connection.query("SELECT id FROM roles WHERE LOWER(name) = 'admin' LIMIT 1");
        const [staffRole] = await connection.query("SELECT id FROM roles WHERE LOWER(name) = 'staff' LIMIT 1");
        const [custRole] = await connection.query("SELECT id FROM roles WHERE LOWER(name) = 'customer' LIMIT 1");

        const adminRoleId = adminRole[0].id;
        const staffRoleId = staffRole[0].id;
        const custRoleId = custRole[0].id;

        // 2. Users
        console.log('2. Seeding users...');
        const adminHash = await bcrypt.hash('Admin@12345', 10);
        const staffHash = await bcrypt.hash('Staff@12345', 10);
        const custHash = await bcrypt.hash('Customer@12345', 10);

        await connection.query(`
            INSERT INTO users (role_id, name, email, password, is_active)
            VALUES (?, 'System Admin', 'admin@brightloop.com', ?, TRUE)
            ON DUPLICATE KEY UPDATE password = VALUES(password)
        `, [adminRoleId, adminHash]);

        await connection.query(`
            INSERT INTO users (role_id, name, email, password, is_active)
            VALUES (?, 'Support Staff', 'staff@brightloop.com', ?, TRUE)
            ON DUPLICATE KEY UPDATE password = VALUES(password)
        `, [staffRoleId, staffHash]);

        await connection.query(`
            INSERT INTO users (role_id, name, email, password, is_active)
            VALUES (?, 'Demo Customer', 'customer@brightloop.com', ?, TRUE)
            ON DUPLICATE KEY UPDATE password = VALUES(password)
        `, [custRoleId, custHash]);

        // 3. Payment Methods
        console.log('3. Seeding payment methods...');
        await connection.query(`
            INSERT IGNORE INTO payment_methods (name) VALUES 
            ('Credit Card'), ('Bank Transfer'), ('UPI'), ('Cash'), ('Cheque');
        `);

        // 4. Customers
        console.log('4. Seeding customers...');
        const customersData = [
            ['Demo Customer', 'customer@brightloop.com', '+91 9876543210', 'Bangalore, India'],
            ['Acron Tech Solutions', 'acron@example.com', '+91 9876500001', '12 Innovation Park, Bengaluru'],
            ['Nexus Retailers Ltd', 'nexus@example.com', '+91 9876500002', '45 MG Road, Kochi'],
            ['Vertex Cloud Systems', 'vertex@example.com', '+91 9876500003', '88 Cyber City, Hyderabad'],
            ['Alpha Global Services', 'alpha@example.com', '+91 9876500004', '101 Ring Road, Pune'],
            ['Zenith Logistics', 'zenith@example.com', '+91 9876500005', '302 Port Road, Chennai']
        ];

        for (const c of customersData) {
            await connection.query(`
                INSERT INTO customers (name, email, phone, address)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE name = VALUES(name)
            `, c);
        }

        // 5. Products
        console.log('5. Seeding products...');
        const productsData = [
            ['Cloud Server Hosting', 'High speed VPS with 99.9% uptime SLA', 1500.00, 'active'],
            ['Enterprise Email Suite', 'Secure corporate email with spam defense', 350.00, 'active'],
            ['SSL Security Certificate', 'Wildcard SSL with 256-bit encryption', 499.00, 'active'],
            ['Database Automated Backup', 'Hourly encrypted cloud snapshots', 750.00, 'active'],
            ['24/7 Priority Support', 'Dedicated account manager and 15-min SLA', 1200.00, 'active'],
            ['Custom Domain Manager', 'DNS management with DDoS protection', 250.00, 'active']
        ];

        for (const p of productsData) {
            await connection.query(`
                INSERT INTO products (name, description, price, status)
                VALUES (?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE price = VALUES(price)
            `, p);
        }

        // 6. Plans
        console.log('6. Seeding plans...');
        const plansData = [
            ['Starter Monthly Plan', 'Basic subscription for small teams', 999.00, 'monthly', 'active'],
            ['Professional Monthly Plan', 'Full feature access with high bandwidth', 2499.00, 'monthly', 'active'],
            ['Enterprise Quarterly Plan', 'Volume-based cloud plan with quarterly billing', 6999.00, 'quarterly', 'active'],
            ['Annual Growth Plan', 'Discounted yearly plan for enterprise infrastructure', 24999.00, 'yearly', 'active']
        ];

        for (const pl of plansData) {
            await connection.query(`
                INSERT INTO plans (name, description, price, billing_cycle, status)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE price = VALUES(price)
            `, pl);
        }

        // 7. Taxes & Discounts
        console.log('7. Seeding taxes and discounts...');
        await connection.query(`
            INSERT INTO taxes (name, rate, status)
            VALUES ('GST (18%)', 18.00, 'active'), ('Service Cess (2%)', 2.00, 'active')
            ON DUPLICATE KEY UPDATE rate = VALUES(rate);
        `);

        await connection.query(`
            INSERT INTO discounts (name, discount_type, value, min_purchase, min_quantity, status)
            VALUES 
            ('Launch Offer 10%', 'percentage', 10.00, 1000.00, 1, 'active'),
            ('Enterprise Rebate ₹1,000', 'fixed', 1000.00, 5000.00, 1, 'active')
            ON DUPLICATE KEY UPDATE value = VALUES(value);
        `);

        // 8. Quotation Templates
        console.log('8. Seeding quotation templates...');
        const [pRows] = await connection.query('SELECT id, price FROM products LIMIT 3');
        const [qtRows] = await connection.query('SELECT id FROM quotation_templates LIMIT 1');
        let qtId = qtRows.length ? qtRows[0].id : null;

        if (!qtId) {
            const [qtResult] = await connection.query(`
                INSERT INTO quotation_templates (name, description, validity_days)
                VALUES ('Standard SaaS Starter Package', 'Curated bundle for new business clients', 30)
            `);
            qtId = qtResult.insertId;

            if (pRows.length > 0 && qtId) {
                for (const pr of pRows) {
                    await connection.query(`
                        INSERT INTO quotation_template_lines (template_id, product_id, quantity, unit_price)
                        VALUES (?, ?, 1, ?)
                    `, [qtId, pr.id, pr.price]);
                }
            }
        }

        // 9. Subscriptions
        console.log('9. Seeding subscriptions...');
        const [customers] = await connection.query('SELECT id FROM customers');
        const [plans] = await connection.query('SELECT id, price, billing_cycle FROM plans');

        const [existSub] = await connection.query('SELECT COUNT(*) AS count FROM subscriptions');
        if (existSub[0].count === 0 && customers.length > 0 && plans.length > 0) {
            const subConfigs = [
                ['SUB-00001', customers[0].id, plans[0].id, '2026-01-01', '2026-12-31', '2026-11-01', 'active'],
                ['SUB-00002', customers[1 % customers.length].id, plans[1 % plans.length].id, '2026-02-15', '2027-02-14', '2026-11-15', 'active'],
                ['SUB-00003', customers[2 % customers.length].id, plans[2 % plans.length].id, '2026-03-01', '2026-12-31', '2026-12-01', 'active'],
                ['SUB-00004', customers[0].id, plans[1 % plans.length].id, '2026-10-01', null, '2026-11-01', 'confirmed'],
                ['SUB-00005', customers[3 % customers.length].id, plans[0].id, '2026-10-15', null, '2026-11-15', 'quotation'],
                ['SUB-00006', customers[4 % customers.length].id, plans[plans.length - 1].id, '2026-10-20', null, '2026-11-20', 'draft'],
                ['SUB-00007', customers[1 % customers.length].id, plans[0].id, '2025-01-01', '2025-12-31', null, 'closed']
            ];

            for (const sc of subConfigs) {
                const [sr] = await connection.query(`
                    INSERT INTO subscriptions
                    (subscription_number, customer_id, plan_id, start_date, end_date, next_billing_date, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, sc);

                if (pRows.length > 0) {
                    await connection.query(`
                        INSERT INTO subscription_items (subscription_id, product_id, quantity, unit_price)
                        VALUES (?, ?, 1, ?)
                    `, [sr.insertId, pRows[0].id, pRows[0].price]);
                }

                await connection.query(`
                    INSERT INTO subscription_history (subscription_id, action, details)
                    VALUES (?, 'seeded', ?)
                `, [sr.insertId, `Subscription created in ${sc[6]} status`]);
            }
        }

        // 10. Invoices & Payments
        console.log('10. Seeding invoices & payments...');
        const [existInv] = await connection.query('SELECT COUNT(*) AS count FROM invoices');
        if (existInv[0].count === 0) {
            const [allSubs] = await connection.query('SELECT id, customer_id FROM subscriptions LIMIT 5');
            const [pmRows] = await connection.query('SELECT id FROM payment_methods LIMIT 3');
            const cardMethodId = pmRows.length > 0 ? pmRows[0].id : null;
            const upiMethodId = pmRows.length > 1 ? pmRows[1].id : cardMethodId;

            const custId1 = allSubs.length > 0 ? allSubs[0].customer_id : customers[0].id;
            const subId1 = allSubs.length > 0 ? allSubs[0].id : null;
            const custId2 = allSubs.length > 1 ? allSubs[1].customer_id : custId1;
            const subId2 = allSubs.length > 1 ? allSubs[1].id : null;

            // Invoice 1: Fully Paid
            const [inv1] = await connection.query(`
                INSERT INTO invoices
                (customer_id, subscription_id, invoice_number, invoice_date, due_date,
                 subtotal, tax_amount, discount_amount, total_amount, paid_amount, outstanding_amount, status)
                VALUES (?, ?, 'INV-00001', '2026-09-01', '2026-09-15', 2500.00, 450.00, 0.00, 2950.00, 2950.00, 0.00, 'paid')
            `, [custId1, subId1]);

            await connection.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
                VALUES (?, 'Monthly Cloud Plan & Security', 1, 2500.00, 2500.00)
            `, [inv1.insertId]);

            await connection.query(`
                INSERT INTO payments (invoice_id, payment_method_id, amount, payment_date, note)
                VALUES (?, ?, 2950.00, '2026-09-05 11:30:00', 'Full payment via Credit Card')
            `, [inv1.insertId, cardMethodId]);

            // Invoice 2: Partially Paid
            const [inv2] = await connection.query(`
                INSERT INTO invoices
                (customer_id, subscription_id, invoice_number, invoice_date, due_date,
                 subtotal, tax_amount, discount_amount, total_amount, paid_amount, outstanding_amount, status)
                VALUES (?, ?, 'INV-00002', '2026-10-01', '2026-10-15', 6000.00, 1080.00, 500.00, 6580.00, 3000.00, 3580.00, 'partially_paid')
            `, [custId2, subId2]);

            await connection.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
                VALUES (?, 'Quarterly Infrastructure & Priority Support', 1, 6000.00, 6000.00)
            `, [inv2.insertId]);

            await connection.query(`
                INSERT INTO payments (invoice_id, payment_method_id, amount, payment_date, note)
                VALUES (?, ?, 3000.00, '2026-10-10 14:00:00', 'Partial instalment via UPI')
            `, [inv2.insertId, upiMethodId]);

            // Invoice 3: Overdue (Confirmed, due date in past, outstanding > 0)
            const [inv3] = await connection.query(`
                INSERT INTO invoices
                (customer_id, subscription_id, invoice_number, invoice_date, due_date,
                 subtotal, tax_amount, discount_amount, total_amount, paid_amount, outstanding_amount, status)
                VALUES (?, ?, 'INV-00003', '2026-09-15', '2026-09-30', 1500.00, 270.00, 0.00, 1770.00, 0.00, 1770.00, 'confirmed')
            `, [custId1, subId1]);

            await connection.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
                VALUES (?, 'Add-on Server Capacity (Overdue)', 1, 1500.00, 1500.00)
            `, [inv3.insertId]);

            // Invoice 4: Draft
            const [inv4] = await connection.query(`
                INSERT INTO invoices
                (customer_id, subscription_id, invoice_number, invoice_date, due_date,
                 subtotal, tax_amount, discount_amount, total_amount, paid_amount, outstanding_amount, status)
                VALUES (?, ?, 'INV-00004', '2026-10-25', '2026-11-10', 999.00, 179.82, 0.00, 1178.82, 0.00, 1178.82, 'draft')
            `, [custId2, subId2]);

            await connection.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, line_total)
                VALUES (?, 'Starter Monthly Plan Renewal', 1, 999.00, 999.00)
            `, [inv4.insertId]);
        }

        await connection.commit();
        console.log('\n==================================================');
        console.log('BRIGHTLOOP DATABASE SEEDED SUCCESSFULLY!');
        console.log('--------------------------------------------------');
        console.log('DEMO LOGINS CREATED:');
        console.log('Admin:    admin@brightloop.com    | Admin@12345');
        console.log('Staff:    staff@brightloop.com    | Staff@12345');
        console.log('Customer: customer@brightloop.com | Customer@12345');
        console.log('==================================================\n');

    } catch (error) {
        await connection.rollback();
        console.error('Seeding error:', error);
        throw error;
    } finally {
        connection.release();
    }
}

if (require.main === module) {
    seedDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = seedDatabase;
