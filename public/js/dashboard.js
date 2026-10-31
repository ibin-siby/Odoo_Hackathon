const API_URL = '/api/payments';
const SUMMARY_URL = '/api/dashboard/summary';

async function loadDashboard() {
    try {
        // Fetch dashboard summary
        const summaryResponse = await fetch(SUMMARY_URL);

        if (!summaryResponse.ok) {
            throw new Error('Failed to load dashboard summary');
        }

        const summary = await summaryResponse.json();

        // Update dashboard cards
        document.getElementById('totalRevenue').textContent =
            '₹' + Number(summary.total_revenue).toFixed(2);

        document.getElementById('outstandingAmount').textContent =
            '₹' + Number(summary.outstanding_amount).toFixed(2);

        document.getElementById('totalPayments').textContent =
            summary.total_payments;

        // Fetch recent payments
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Failed to load payments');
        }

        const payments = await response.json();

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
                <td colspan="5">Unable to load dashboard data.</td>
            </tr>
        `;
    }
}

// Load dashboard when page opens
document.addEventListener('DOMContentLoaded', loadDashboard);