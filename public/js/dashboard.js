const API_URL = 'http://localhost:5000/api/payments';

async function loadDashboard() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Failed to load payments');
        }

        const payments = await response.json();

        // Calculate total revenue
        const totalRevenue = payments.reduce(
            (sum, payment) => sum + Number(payment.amount || 0),
            0
        );

        // Update dashboard cards
        document.getElementById('totalRevenue').textContent =
            '₹' + totalRevenue.toFixed(2);

        document.getElementById('totalPayments').textContent =
            payments.length;

        // Display payment records
        const table = document.getElementById('paymentsTable');

        if (payments.length === 0) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">No payment records available.</td>
                </tr>
            `;
            return;
        }

        table.innerHTML = payments.map(payment => `
            <tr>
                <td>${payment.id}</td>
                <td>${payment.customer_name || 'N/A'}</td>
                <td>${payment.invoice_number || 'N/A'}</td>
                <td>₹${Number(payment.amount).toFixed(2)}</td>
                <td>${payment.payment_date
                    ? new Date(payment.payment_date).toLocaleDateString()
                    : 'N/A'}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Dashboard error:', error);

        document.getElementById('paymentsTable').innerHTML = `
            <tr>
                <td colspan="5">Unable to load payments.</td>
            </tr>
        `;
    }
}

// Load dashboard when page opens
document.addEventListener('DOMContentLoaded', loadDashboard);