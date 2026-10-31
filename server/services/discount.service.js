const pool = require('../db');

/**
 * Applies eligible discounts for an invoice
 * @param {object} connection Optional transaction connection
 * @param {object} invoiceData { customer_id, subtotal, quantity, items }
 */
async function applyDiscounts(connection, invoiceData) {
    const conn = connection || pool;
    const subtotal = Number(invoiceData.subtotal || 0);
    const quantity = Number(invoiceData.quantity || 1);

    const [discounts] = await conn.query(
        "SELECT * FROM discounts WHERE status = 'active'"
    );

    let totalDiscount = 0;
    const appliedDiscounts = [];

    for (const d of discounts) {
        // check min purchase
        if (Number(d.min_purchase) > 0 && subtotal < Number(d.min_purchase)) {
            continue;
        }

        // check min quantity
        if (Number(d.min_quantity) > 0 && quantity < Number(d.min_quantity)) {
            continue;
        }

        let amount = 0;
        if (d.discount_type === 'percentage') {
            amount = (subtotal * Number(d.value)) / 100;
        } else {
            amount = Math.min(Number(d.value), subtotal);
        }

        if (amount > 0) {
            totalDiscount += amount;
            appliedDiscounts.push({
                discount_id: d.id,
                name: d.name,
                amount
            });
            // Only apply one best discount by default
            break;
        }
    }

    return {
        discount_total: Math.min(totalDiscount, subtotal),
        applied: appliedDiscounts
    };
}

module.exports = { applyDiscounts };
