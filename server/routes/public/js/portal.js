// Customer Portal functionality

const token = sessionStorage.getItem('token');

const subscriptionsTable = document.getElementById('subscriptionsTable');
const invoicesTable = document.getElementById('invoicesTable');
const welcomeName = document.getElementById('welcomeName');
const message = document.getElementById('message');

// Check login
if (!token) {
    window.location.href = 'login.html';
}

// Display customer name
const savedUser = JSON.parse(sessionStorage.getItem('user') || '{}');

if (welcomeName) {
    welcomeName.textContent = `Welcome, ${savedUser.name || 'Customer'}`;
}

// Fetch customer data
async function loadPortalData() {
    try {
        const headers = {
            'Authorization': `Bearer ${token}`
        };

        // Verify logged-in user
        const userResponse = await fetch('/api/auth/me', { headers });

        if (!userResponse.ok) {
            sessionStorage.clear();
            window.location.href = 'login.html';
            return;
        }

        // Fetch subscriptions
        const subscriptionResponse = await fetch(
            '/api/auth/my-subscriptions',
            { headers }
        );

        const subscriptionData = await subscriptionResponse.json();

        if (subscriptionResponse.ok) {
            displaySubscriptions(subscriptionData.subscriptions);
        } else {
            subscriptionsTable.innerHTML =
                '<tr><td colspan="5">Unable to load subscriptions.</td></tr>';
        }

        // Fetch invoices
        const invoiceResponse = await fetch(
            '/api/auth/my-invoices',
            { headers }
        );

        const invoiceData = await invoiceResponse.json();

        if (invoiceResponse.ok) {
            displayInvoices(invoiceData.invoices);
        } else {
            invoicesTable.innerHTML =
                '<tr><td colspan="5">Unable to load invoices.</td></tr>';
        }

    } catch (error) {
        console.error('Portal loading error:', error);

        message.className = 'alert alert-danger';
        message.textContent = 'Unable to load portal data. Please try again.';
    }
}

// Display subscriptions
function displaySubscriptions(subscriptions) {
    subscriptionsTable.innerHTML = '';

    if (!subscriptions || subscriptions.length === 0) {
        subscriptionsTable.innerHTML =
            '<tr><td colspan="5" class="text-center">No subscriptions found.</td></tr>';
        return;
    }

    subscriptions.forEach(subscription => {
        const row = document.createElement('tr');

        const values = [
            subscription.subscription_number,
            subscription.plan_name,
            subscription.status,
            subscription.start_date,
            subscription.expiry_date
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value ?? '-';
            row.appendChild(cell);
        });

        subscriptionsTable.appendChild(row);
    });
}

// Display invoices
function displayInvoices(invoices) {
    invoicesTable.innerHTML = '';

    if (!invoices || invoices.length === 0) {
        invoicesTable.innerHTML =
            '<tr><td colspan="5" class="text-center">No invoices found.</td></tr>';
        return;
    }

    invoices.forEach(invoice => {
        const row = document.createElement('tr');

        const values = [
            invoice.invoice_number,
            invoice.invoice_date,
            invoice.total,
            invoice.outstanding_amount,
            invoice.status
        ];

        values.forEach(value => {
            const cell = document.createElement('td');
            cell.textContent = value ?? '-';
            row.appendChild(cell);
        });

        invoicesTable.appendChild(row);
    });
}

// Logout
const logoutBtn = document.getElementById('logoutBtn');

if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        sessionStorage.clear();
        window.location.href = 'login.html';
    });
}

// Load portal data
if (token) {
    loadPortalData();
}