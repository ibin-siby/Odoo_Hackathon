// Subscription Plans Management

let allPlans = [];

async function loadPlans() {
    try {
        const res = await window.api.get('/api/plans');
        allPlans = res.data || [];
        renderPlans(allPlans);
    } catch (err) {
        console.error('Error loading plans:', err);
    }
}

function renderPlans(plans) {
    const tbody = document.getElementById('plansTable');
    if (!tbody) return;

    if (plans.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No plans configured yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = plans.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td><span class="text-muted small">${p.description || '-'}</span></td>
            <td><strong class="fs-6" style="color: var(--emerald);">₹${Number(p.price).toFixed(2)}</strong></td>
            <td><span class="text-capitalize badge bg-light text-dark border">${p.billing_cycle}</span></td>
            <td><span class="badge-status status-${p.status}">${p.status}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary btn-sm" onclick="editPlan(${p.id})">Edit</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deletePlan(${p.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function prepareAddPlan() {
    document.getElementById('planModalTitle').textContent = 'Create Subscription Plan';
    document.getElementById('planId').value = '';
    document.getElementById('planName').value = '';
    document.getElementById('planDescription').value = '';
    document.getElementById('planPrice').value = '';
    document.getElementById('planBillingCycle').value = 'monthly';
    document.getElementById('planStatus').value = 'active';
}

function editPlan(id) {
    const p = allPlans.find(item => item.id === id);
    if (!p) return;

    document.getElementById('planModalTitle').textContent = 'Edit Subscription Plan';
    document.getElementById('planId').value = p.id;
    document.getElementById('planName').value = p.name;
    document.getElementById('planDescription').value = p.description || '';
    document.getElementById('planPrice').value = Number(p.price).toFixed(2);
    document.getElementById('planBillingCycle').value = p.billing_cycle || 'monthly';
    document.getElementById('planStatus').value = p.status || 'active';

    const modal = new bootstrap.Modal(document.getElementById('planModal'));
    modal.show();
}

async function deletePlan(id) {
    if (!confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
        await window.api.delete(`/api/plans/${id}`);
        loadPlans();
    } catch (err) {
        alert(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPlans();

    const form = document.getElementById('planForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('planId').value;
            const payload = {
                name: document.getElementById('planName').value.trim(),
                description: document.getElementById('planDescription').value.trim(),
                price: Number(document.getElementById('planPrice').value),
                billing_cycle: document.getElementById('planBillingCycle').value,
                status: document.getElementById('planStatus').value
            };

            try {
                if (id) {
                    await window.api.put(`/api/plans/${id}`, payload);
                } else {
                    await window.api.post('/api/plans', payload);
                }

                const modalEl = document.getElementById('planModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
                loadPlans();
            } catch (err) {
                alert('Plan save failed: ' + err.message);
            }
        });
    }
});

