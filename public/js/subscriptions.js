// Subscriptions Pipeline & Kanban Management

let allSubscriptions = [];

async function loadSubscriptions() {
    try {
        const res = await window.api.get('/api/subscriptions');
        allSubscriptions = res.data || [];
        renderKanban(allSubscriptions);
        renderTable(allSubscriptions);
    } catch (err) {
        console.error('Failed to load subscriptions:', err);
    }
}

function renderKanban(subs) {
    const statuses = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

    // Clear columns
    statuses.forEach(status => {
        const container = document.getElementById(`cards-${status}`);
        const countBadge = document.getElementById(`count-${status}`);
        if (container) container.innerHTML = '';
        if (countBadge) countBadge.textContent = '0';
    });

    const counts = { draft: 0, quotation: 0, confirmed: 0, active: 0, closed: 0 };

    subs.forEach(s => {
        let status = (s.status || 'draft').toLowerCase();
        if (status === 'pending') status = 'draft';
        if (status === 'cancelled') status = 'closed';

        if (!counts.hasOwnProperty(status)) return;

        counts[status]++;
        const container = document.getElementById(`cards-${status}`);
        if (!container) return;

        const card = document.createElement('div');
        card.className = 'kanban-card';
        card.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <span class="card-number">${s.subscription_number || 'SUB-' + s.id}</span>
                <span class="badge-status status-${status}">${status}</span>
            </div>
            <div class="card-customer">${s.customer_name}</div>
            <div class="card-plan">
                <span>${s.plan_name}</span> • <strong>₹${Number(s.plan_price || 0).toFixed(2)}</strong>/${s.billing_cycle || 'mo'}
            </div>
            <div class="card-footer-info text-muted">
                <span>Start: ${s.start_date || '-'}</span>
                ${status !== 'closed' ? `
                    <button class="btn btn-sm btn-outline-dark px-2 py-0 advance-btn" style="font-size: 11px;" data-id="${s.id}">
                        Advance →
                    </button>
                ` : `
                    <span class="small">Completed</span>
                `}
            </div>
        `;

        // Card click opens details (excluding advance button)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.advance-btn')) return;
            openSubscriptionDetails(s.id);
        });

        const advBtn = card.querySelector('.advance-btn');
        if (advBtn) {
            advBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                advanceSubscription(s.id);
            });
        }

        container.appendChild(card);
    });

    // Update column counters
    statuses.forEach(status => {
        const countBadge = document.getElementById(`count-${status}`);
        if (countBadge) countBadge.textContent = counts[status];
    });
}

function renderTable(subs) {
    const tbody = document.getElementById('subscriptionsTableBody');
    if (!tbody) return;

    if (subs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No subscriptions found.</td></tr>`;
        return;
    }

    tbody.innerHTML = subs.map(s => `
        <tr>
            <td><strong>${s.subscription_number || 'SUB-' + s.id}</strong></td>
            <td>
                <div class="fw-semibold">${s.customer_name}</div>
                <div class="small text-muted">${s.customer_email || ''}</div>
            </td>
            <td>${s.plan_name}</td>
            <td>₹${Number(s.plan_price || 0).toFixed(2)} / ${s.billing_cycle || 'monthly'}</td>
            <td>${s.start_date || '-'}</td>
            <td>${s.next_billing_date || s.end_date || 'N/A'}</td>
            <td><span class="badge-status status-${s.status}">${s.status}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary btn-sm" onclick="openSubscriptionDetails(${s.id})">Details</button>
                    ${s.status !== 'closed' && s.status !== 'cancelled' ? `
                        <button class="btn btn-outline-primary btn-sm" onclick="advanceSubscription(${s.id})">Advance</button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

async function advanceSubscription(id) {
    try {
        const res = await window.api.patch(`/api/subscriptions/${id}/transition`, {});
        loadSubscriptions();
    } catch (err) {
        alert('Transition error: ' + err.message);
    }
}

async function openSubscriptionDetails(id) {
    const title = document.getElementById('subDetailsTitle');
    const body = document.getElementById('subDetailsBody');
    body.innerHTML = '<p class="text-center py-3 text-muted">Loading...</p>';

    const modal = new bootstrap.Modal(document.getElementById('subDetailsModal'));
    modal.show();

    try {
        const res = await window.api.get(`/api/subscriptions/${id}`);
        const sub = res.data;

        title.textContent = `Subscription ${sub.subscription_number || 'SUB-' + sub.id}`;

        const itemsHtml = (sub.items || []).map(item => `
            <tr>
                <td>${item.product_name}</td>
                <td>${item.quantity}</td>
                <td>₹${Number(item.unit_price).toFixed(2)}</td>
            </tr>
        `).join('') || `<tr><td colspan="3" class="text-muted text-center">No add-on products</td></tr>`;

        const historyHtml = (sub.history || []).map(h => `
            <div class="border-start border-2 border-primary ps-3 pb-3 position-relative">
                <div class="small text-muted">${new Date(h.created_at).toLocaleString()}</div>
                <div class="fw-semibold text-capitalize">${h.action}</div>
                <div class="small text-secondary">${h.details || ''}</div>
            </div>
        `).join('') || `<div class="text-muted small">No history logged yet.</div>`;

        body.innerHTML = `
            <div class="row g-3 mb-4">
                <div class="col-md-6">
                    <div class="p-3 rounded" style="background: var(--ivory);">
                        <div class="small text-muted fw-bold">CUSTOMER</div>
                        <div class="h5 mb-0">${sub.customer_name}</div>
                        <div class="small text-muted">${sub.customer_email || ''}</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="p-3 rounded" style="background: var(--ivory);">
                        <div class="small text-muted fw-bold">PLAN & BILLING</div>
                        <div class="h5 mb-0">${sub.plan_name}</div>
                        <div class="small text-muted">₹${Number(sub.plan_price || 0).toFixed(2)} / ${sub.billing_cycle}</div>
                    </div>
                </div>
            </div>

            <div class="row g-3 mb-4">
                <div class="col-md-3">
                    <div class="small text-muted fw-bold">STATUS</div>
                    <span class="badge-status status-${sub.status} mt-1">${sub.status}</span>
                </div>
                <div class="col-md-3">
                    <div class="small text-muted fw-bold">START DATE</div>
                    <div class="fw-semibold mt-1">${sub.start_date || '-'}</div>
                </div>
                <div class="col-md-3">
                    <div class="small text-muted fw-bold">NEXT BILLING</div>
                    <div class="fw-semibold mt-1">${sub.next_billing_date || '-'}</div>
                </div>
                <div class="col-md-3">
                    <div class="small text-muted fw-bold">EXPIRY DATE</div>
                    <div class="fw-semibold mt-1">${sub.end_date || 'No Expiry'}</div>
                </div>
            </div>

            <h6 class="fw-bold text-muted mb-2">ADD-ON PRODUCTS</h6>
            <div class="table-responsive mb-4">
                <table class="table table-sm border">
                    <thead class="table-light">
                        <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>

            <h6 class="fw-bold text-muted mb-3">AUDIT & TRANSITION HISTORY</h6>
            <div class="ms-2">
                ${historyHtml}
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

// Populate customers and plans dropdown
async function populateFormDropdowns() {
    try {
        const [custRes, planRes] = await Promise.all([
            window.api.get('/api/customers'),
            window.api.get('/api/plans')
        ]);

        const custSelect = document.getElementById('subCustomerSelect');
        const planSelect = document.getElementById('subPlanSelect');

        if (custSelect) {
            custSelect.innerHTML = '<option value="">Select customer...</option>' + 
                (custRes.data || []).map(c => `<option value="${c.id}">${c.name} (${c.email || 'No email'})</option>`).join('');
        }

        if (planSelect) {
            planSelect.innerHTML = '<option value="">Select plan...</option>' + 
                (planRes.data || []).map(p => `<option value="${p.id}">${p.name} - ₹${Number(p.price).toFixed(2)} (${p.billing_cycle})</option>`).join('');
        }

        // Default start date to today
        const startDateInput = document.getElementById('subStartDate');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }
    } catch (err) {
        console.error('Dropdown population error:', err);
    }
}

// Attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadSubscriptions();
    populateFormDropdowns();

    // View toggle
    const kanbanBtn = document.getElementById('viewKanbanBtn');
    const tableBtn = document.getElementById('viewTableBtn');
    const kanbanCont = document.getElementById('kanbanContainer');
    const tableCont = document.getElementById('tableContainer');

    if (kanbanBtn && tableBtn) {
        kanbanBtn.addEventListener('click', () => {
            kanbanBtn.classList.add('active');
            tableBtn.classList.remove('active');
            kanbanCont.classList.remove('d-none');
            tableCont.classList.add('d-none');
        });

        tableBtn.addEventListener('click', () => {
            tableBtn.classList.add('active');
            kanbanBtn.classList.remove('active');
            tableCont.classList.remove('d-none');
            kanbanCont.classList.add('d-none');
        });
    }

    // New Subscription Form
    const form = document.getElementById('newSubForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                customer_id: document.getElementById('subCustomerSelect').value,
                plan_id: document.getElementById('subPlanSelect').value,
                start_date: document.getElementById('subStartDate').value,
                end_date: document.getElementById('subEndDate').value || null,
                status: document.getElementById('subInitialStatus').value
            };

            try {
                const res = await window.api.post('/api/subscriptions', payload);
                const modal = bootstrap.Modal.getInstance(document.getElementById('newSubModal'));
                if (modal) modal.hide();
                form.reset();
                loadSubscriptions();
            } catch (err) {
                alert('Failed to create subscription: ' + err.message);
            }
        });
    }
});
