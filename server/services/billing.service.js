const pool = require('../db');
const { applyDiscounts } = require('./discount.service');

// Calculate next billing date
function advanceBillingDate(currentDateStr, cycle) {
    const d = new Date(currentDateStr || Date.now());
    if (cycle === 'daily') d.setDate(d.getDate() + 1);
    else if (cycle === 'weekly') d.setDate(d.getDate() + 7);
    else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
    else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1); // default monthly
    return d.toISOString().split('T')[0];
}

async function runBilling() {
    const connection = await pool.getConnection();
    const stats = {
        subscriptions_checked: 0,
        invoices_created: 0,
        errors_count: 0,
        invoices: []
    };

    try {
        // Find active subscriptions due for billing
        const [dueSubs] = await connection.query(`
            SELECT s.*, p.name AS plan_name, p.price AS plan_price, p.billing_cycle,
                   c.name AS customer_name, c.email AS customer_email
            FROM subscriptions s
            JOIN plans p ON s.plan_id = p.id
            JOIN customers c ON s.customer_id = c.id
            WHERE s.status = 'active'
              AND (s.next_billing_date IS NULL OR s.next_billing_date <= CURDATE())
              AND (s.end_date IS NULL OR s.end_date >= CURDATE())
        `);

        stats.subscriptions_checked = dueSubs.length;

        for (const sub of dueSubs) {
            try {
                await connection.beginTransaction();

                const todayStr = new Date().toISOString().split('T')[0];

                // Check for duplicate invoice today for this subscription
                const [existing] = await connection.query(
                    'SELECT id FROM invoices WHERE subscription_id = ? AND invoice_date = ?',
                    [sub.id, todayStr]
                );

                if (existing.length > 0) {
                    // Already billed today, skip
                    await connection.rollback();
                    continue;
                }

                // Get subscription items
                const [items] = await connection.query(`
                    SELECT si.*, pr.name AS product_name
                    FROM subscription_items si
                    JOIN products pr ON si.product_id = pr.id
                    WHERE si.subscription_id = ?
                `, [sub.id]);

                let subtotal = Number(sub.plan_price);
                const invoiceLines = [
                    {
                        product_id: null,
                        description: `Plan Subscription: ${sub.plan_name} (${sub.billing_cycle})`,
                        quantity: 1,
                        unit_price: Number(sub.plan_price),
                        line_total: Number(sub.plan_price)
                    }
                ];

                for (const item of items) {
                    const linePrice = Number(item.unit_price) * Number(item.quantity);
                    subtotal += linePrice;
                    invoiceLines.push({
                        product_id: item.product_id,
                        description: `Addon: ${item.product_name}`,
                        quantity: item.quantity,
                        unit_price: Number(item.unit_price),
                        line_total: linePrice
                    });
                }

                // Check discounts
                const discountResult = await applyDiscounts(connection, {
                    customer_id: sub.customer_id,
                    subtotal,
                    quantity: invoiceLines.length
                });

                const discountAmount = discountResult.discount_total || 0;

                // Check default active tax
                const [taxes] = await connection.query("SELECT * FROM taxes WHERE status = 'active' LIMIT 1");
                const taxRate = taxes.length ? Number(taxes[0].rate) : 0;

                const taxable = Math.max(0, subtotal - discountAmount);
                const taxAmount = (taxable * taxRate) / 100;
                const grandTotal = taxable + taxAmount;

                // Generate invoice number
                const [maxRows] = await connection.query('SELECT MAX(id) AS maxId FROM invoices');
                const nextId = (maxRows[0].maxId || 0) + 1;
                const invoiceNumber = `INV-${String(nextId).padStart(5, '0')}`;

                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 15);
                const dueDateStr = dueDate.toISOString().split('T')[0];

                const [invResult] = await connection.query(
                    `INSERT INTO invoices
                    (customer_id, subscription_id, invoice_number,
                     invoice_date, due_date, subtotal, tax_amount, discount_amount,
                     total_amount, paid_amount, outstanding_amount, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'confirmed')`,
                    [
                        sub.customer_id,
                        sub.id,
                        invoiceNumber,
                        todayStr,
                        dueDateStr,
                        subtotal,
                        taxAmount,
                        discountAmount,
                        grandTotal,
                        grandTotal
                    ]
                );

                const invoiceId = invResult.insertId;

                for (const line of invoiceLines) {
                    await connection.query(
                        `INSERT INTO invoice_items
                        (invoice_id, product_id, description, quantity, unit_price, line_total)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                        [
                            invoiceId,
                            line.product_id,
                            line.description,
                            line.quantity,
                            line.unit_price,
                            line.line_total
                        ]
                    );
                }

                // Advance subscription next_billing_date
                const newNextDate = advanceBillingDate(todayStr, sub.billing_cycle);
                await connection.query(
                    'UPDATE subscriptions SET next_billing_date = ? WHERE id = ?',
                    [newNextDate, sub.id]
                );

                await connection.query(
                    `INSERT INTO subscription_history (subscription_id, action, details)
                     VALUES (?, 'billed', ?)`,
                    [sub.id, `Generated invoice ${invoiceNumber} for amount ₹${grandTotal.toFixed(2)}`]
                );

                await connection.commit();

                stats.invoices_created++;
                stats.invoices.push({
                    subscription_id: sub.id,
                    subscription_number: sub.subscription_number,
                    invoice_id: invoiceId,
                    invoice_number: invoiceNumber,
                    total: grandTotal
                });

            } catch (itemErr) {
                await connection.rollback();
                stats.errors_count++;
                console.error(`Billing error for subscription ${sub.id}:`, itemErr);
            }
        }

        return stats;

    } finally {
        connection.release();
    }
}

module.exports = { runBilling };
