// Customer Portal Logic

async function loadPortalData() {
    const user = window.api ? window.api.getUser() : {};
    if (!window.api || !window.api.getToken()) {
        window.location.href = 'login.html';
        return;
    }

    const greeting = document.getElementById('portalGreeting');
    if (greeting && user.name) {
        greeting.textContent = `Welcome back, ${user.name}`;
    }

    const alertBox = document.getElementById('portalAlert');

    try {
        // Fetch subscriptions & invoices
        const [subRes, invRes] = await Promise.all([
            window.api.get('/api/portal/subscriptions').catch(() => window.api.get('/api/auth/my-subscriptions')),
            window.api.get('/api/portal/invoices').catch(() => window.api.get('/api/auth/my-invoices'))
        ]);

        const subscriptions = (subRes && (subRes.subscriptions || subRes.data)) || [];
        const invoices = (invRes && (invRes.invoices || invRes.data)) || [];

        // Update counts
        const activeCount = subscriptions.filter(s => s.status === 'active').length;
        document.getElementById('subCount').textContent = activeCount;
        document.getElementById('invCount').textContent = invoices.length;

        const outstandingTotal = invoices.reduce((sum, inv) => sum + Number(inv.outstanding_amount || 0), 0);
        document.getElementById('totalOutstanding').textContent = `₹${outstandingTotal.toFixed(2)}`;

        // Render Subscriptions
        const subsTable = document.getElementById('portalSubsTable');
        if (subscriptions.length === 0) {
            subsTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No subscriptions found for your account.</td></tr>`;
        } else {
            subsTable.innerHTML = subscriptions.map(s => `
                <tr>
                    <td><strong>${s.subscription_number || 'SUB-' + s.id}</strong></td>
                    <td>
                        <div class="fw-semibold">${s.plan_name}</div>
                        <div class="small text-muted">₹${Number(s.price || 0).toFixed(2)}</div>
                    </td>
                    <td><span class="text-capitalize">${s.billing_cycle || 'monthly'}</span></td>
                    <td>${s.start_date || '-'}</td>
                    <td>${s.next_billing_date || s.expiry_date || 'Ongoing'}</td>
                    <td><span class="badge-status status-${s.status}">${s.status}</span></td>
                </tr>
            `).join('');
        }

        // Render Invoices
        const invsTable = document.getElementById('portalInvsTable');
        if (invoices.length === 0) {
            invsTable.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No invoices generated yet.</td></tr>`;
        } else {
            invsTable.innerHTML = invoices.map(i => `
                <tr>
                    <td><strong>${i.invoice_number}</strong></td>
                    <td>${i.invoice_date || '-'}</td>
                    <td>${i.due_date || '-'}</td>
                    <td><strong>₹${Number(i.total_amount).toFixed(2)}</strong></td>
                    <td class="text-success">₹${Number(i.paid_amount || 0).toFixed(2)}</td>
                    <td class="text-danger fw-semibold">₹${Number(i.outstanding_amount || 0).toFixed(2)}</td>
                    <td><span class="badge-status status-${i.status}">${i.status}</span></td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Portal load error:', err);
        if (alertBox) {
            alertBox.className = 'alert alert-danger';
            alertBox.textContent = 'Failed to load your account data: ' + err.message;
            alertBox.classList.remove('d-none');
        }
    }
}

document.addEventListener('DOMContentLoaded', loadPortalData);
