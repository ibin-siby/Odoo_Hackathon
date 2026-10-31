// Invoices & Billing Management

let allInvoices = [];

async function loadInvoices() {
    try {
        const filter = document.getElementById('statusFilter').value;
        const endpoint = filter ? `/api/invoices?status=${filter}` : '/api/invoices';
        const res = await window.api.get(endpoint);
        allInvoices = res.data || [];
        renderInvoicesTable(allInvoices);
    } catch (err) {
        console.error('Failed to load invoices:', err);
    }
}

function renderInvoicesTable(invoices) {
    const tbody = document.getElementById('invoicesTableBody');
    const countText = document.getElementById('invoiceCountText');
    if (countText) countText.textContent = `Showing ${invoices.length} invoices`;

    if (!tbody) return;

    if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted">No invoices found.</td></tr>`;
        return;
    }

    tbody.innerHTML = invoices.map(i => {
        const isOverdue = i.is_overdue === 1 || (i.status === 'confirmed' && new Date(i.due_date) < new Date() && Number(i.outstanding_amount) > 0);
        return `
            <tr>
                <td><strong>${i.invoice_number}</strong></td>
                <td>
                    <div class="fw-semibold">${i.customer_name}</div>
                    <div class="small text-muted">${i.customer_email || ''}</div>
                </td>
                <td>${i.invoice_date}</td>
                <td>
                    <div>${i.due_date}</div>
                    ${isOverdue ? '<span class="badge bg-danger" style="font-size: 10px;">OVERDUE</span>' : ''}
                </td>
                <td><strong>₹${Number(i.total_amount).toFixed(2)}</strong></td>
                <td class="text-success">₹${Number(i.paid_amount || 0).toFixed(2)}</td>
                <td class="${Number(i.outstanding_amount) > 0 ? 'text-danger fw-bold' : 'text-muted'}">
                    ₹${Number(i.outstanding_amount || 0).toFixed(2)}
                </td>
                <td>
                    <span class="badge-status status-${i.status}">${i.status}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-secondary btn-sm" onclick="viewInvoiceDetails(${i.id})">View / Print</button>
                        ${i.status === 'draft' ? `
                            <button class="btn btn-outline-success btn-sm" onclick="confirmInvoice(${i.id})">Confirm</button>
                        ` : ''}
                        ${i.status !== 'paid' && i.status !== 'cancelled' && Number(i.paid_amount) === 0 ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="cancelInvoice(${i.id})">Cancel</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function viewInvoiceDetails(id) {
    const title = document.getElementById('detailsModalTitle');
    const container = document.getElementById('invoicePrintContent');
    const actions = document.getElementById('invoiceDetailsActions');

    container.innerHTML = '<p class="text-center py-4 text-muted">Loading invoice details...</p>';
    actions.innerHTML = '';

    const modal = new bootstrap.Modal(document.getElementById('invoiceDetailsModal'));
    modal.show();

    try {
        const res = await window.api.get(`/api/invoices/${id}`);
        const inv = res.data;

        title.textContent = `Invoice ${inv.invoice_number}`;

        const linesHtml = (inv.items || []).map(item => `
            <tr>
                <td>${item.description}</td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-end">₹${Number(item.unit_price).toFixed(2)}</td>
                <td class="text-end">₹${Number(item.line_total).toFixed(2)}</td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="text-center text-muted">No items</td></tr>`;

        const paymentsHtml = (inv.payments || []).map(p => `
            <tr>
                <td>${p.payment_date_formatted || p.payment_date}</td>
                <td>${p.payment_method_name || 'Standard'}</td>
                <td>${p.note || '-'}</td>
                <td class="text-end text-success fw-bold">₹${Number(p.amount).toFixed(2)}</td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="text-center text-muted">No payments recorded</td></tr>`;

        container.innerHTML = `
            <div class="p-3">
                <div class="d-flex justify-content-between align-items-start border-bottom pb-3 mb-4">
                    <div>
                        <h2 class="brand-font mb-0" style="color: var(--plum);">Brightloop</h2>
                        <div class="text-muted small">Subscription Management Platform</div>
                        <div class="text-muted small">Tax Invoice / Receipt</div>
                    </div>
                    <div class="text-end">
                        <h4 class="mb-1">${inv.invoice_number}</h4>
                        <span class="badge-status status-${inv.status}">${inv.status}</span>
                    </div>
                </div>

                <div class="row g-3 mb-4">
                    <div class="col-6">
                        <div class="small fw-bold text-muted text-uppercase">Billed To</div>
                        <div class="fw-bold fs-6">${inv.customer_name}</div>
                        <div class="text-muted small">${inv.customer_email || ''}</div>
                        <div class="text-muted small">${inv.customer_phone || ''}</div>
                        <div class="text-muted small">${inv.customer_address || ''}</div>
                    </div>
                    <div class="col-6 text-end">
                        <div class="small fw-bold text-muted text-uppercase">Invoice Details</div>
                        <div class="small"><strong>Invoice Date:</strong> ${inv.invoice_date}</div>
                        <div class="small"><strong>Due Date:</strong> ${inv.due_date}</div>
                        ${inv.subscription_id ? `<div class="small"><strong>Subscription:</strong> #${inv.subscription_id}</div>` : ''}
                    </div>
                </div>

                <div class="table-responsive mb-4">
                    <table class="table table-bordered">
                        <thead class="table-light">
                            <tr>
                                <th>Description</th>
                                <th class="text-center" style="width: 80px;">Qty</th>
                                <th class="text-end" style="width: 140px;">Unit Price</th>
                                <th class="text-end" style="width: 140px;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${linesHtml}</tbody>
                    </table>
                </div>

                <div class="row justify-content-end mb-4">
                    <div class="col-md-5">
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span>Subtotal:</span>
                            <span>₹${Number(inv.subtotal).toFixed(2)}</span>
                        </div>
                        ${Number(inv.discount_amount) > 0 ? `
                            <div class="d-flex justify-content-between py-1 border-bottom text-success">
                                <span>Discount:</span>
                                <span>-₹${Number(inv.discount_amount).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="d-flex justify-content-between py-1 border-bottom">
                            <span>Taxes:</span>
                            <span>₹${Number(inv.tax_amount).toFixed(2)}</span>
                        </div>
                        <div class="d-flex justify-content-between py-2 border-bottom fw-bold fs-5" style="color: var(--plum);">
                            <span>Total Due:</span>
                            <span>₹${Number(inv.total_amount).toFixed(2)}</span>
                        </div>
                        <div class="d-flex justify-content-between py-1 border-bottom text-success">
                            <span>Amount Paid:</span>
                            <span>₹${Number(inv.paid_amount || 0).toFixed(2)}</span>
                        </div>
                        <div class="d-flex justify-content-between py-2 fw-bold text-danger">
                            <span>Outstanding:</span>
                            <span>₹${Number(inv.outstanding_amount || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="mt-4 pt-3 border-top">
                    <h6 class="small fw-bold text-muted text-uppercase mb-2">Payment History</h6>
                    <table class="table table-sm">
                        <thead class="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Method</th>
                                <th>Note</th>
                                <th class="text-end">Amount</th>
                            </tr>
                        </thead>
                        <tbody>${paymentsHtml}</tbody>
                    </table>
                </div>
            </div>
        `;

        actions.innerHTML = `
            ${inv.status === 'draft' ? `
                <button type="button" class="btn btn-outline-success btn-sm" onclick="confirmInvoice(${inv.id})">Confirm Invoice</button>
            ` : ''}
            ${inv.status !== 'paid' && inv.status !== 'cancelled' ? `
                <a href="payments.html" class="btn btn-secondary-custom btn-sm">Record Payment</a>
            ` : ''}
            <button type="button" class="btn btn-outline-dark btn-sm" onclick="sendInvoice(${inv.id})">✉️ Send Email</button>
            <button type="button" class="btn btn-brightloop btn-sm" onclick="window.print()">🖨️ Print Invoice</button>
        `;

    } catch (err) {
        container.innerHTML = `<div class="alert alert-danger">Error: ${err.message}</div>`;
    }
}

async function confirmInvoice(id) {
    if (!confirm('Confirm this invoice? It will become due for payment.')) return;
    try {
        await window.api.post(`/api/invoices/${id}/confirm`, {});
        alert('Invoice confirmed successfully!');
        loadInvoices();
        const modalEl = document.getElementById('invoiceDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function cancelInvoice(id) {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
        await window.api.post(`/api/invoices/${id}/cancel`, {});
        alert('Invoice cancelled.');
        loadInvoices();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function sendInvoice(id) {
    try {
        const res = await window.api.post(`/api/invoices/${id}/send`, {});
        alert(res.message);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Add line item row to create form
function addLineItemRow() {
    const container = document.getElementById('lineItemsContainer');
    const row = document.createElement('div');
    row.className = 'row g-2 align-items-center line-item-row';
    row.innerHTML = `
        <div class="col-md-6">
            <input type="text" class="form-control form-control-sm item-desc" placeholder="Item description" required>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control form-control-sm item-qty" value="1" min="1" placeholder="Qty" required>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control form-control-sm item-price" placeholder="Price (₹)" step="0.01" min="0" required>
        </div>
        <div class="col-md-1 text-center">
            <button type="button" class="btn btn-sm text-danger remove-line-btn">✕</button>
        </div>
    `;

    row.querySelector('.remove-line-btn').addEventListener('click', () => {
        if (document.querySelectorAll('.line-item-row').length > 1) {
            row.remove();
        }
    });

    container.appendChild(row);
}

// Setup customers dropdown
async function initForm() {
    try {
        const custRes = await window.api.get('/api/customers');
        const select = document.getElementById('invCustomerSelect');
        if (select) {
            select.innerHTML = '<option value="">Select customer...</option>' + 
                (custRes.data || []).map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        const today = new Date().toISOString().split('T')[0];
        const due = new Date();
        due.setDate(due.getDate() + 15);
        const dueStr = due.toISOString().split('T')[0];

        const dateEl = document.getElementById('invDate');
        const dueEl = document.getElementById('invDueDate');
        if (dateEl) dateEl.value = today;
        if (dueEl) dueEl.value = dueStr;

        addLineItemRow();
    } catch (err) {
        console.error('Form init error:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadInvoices();
    initForm();

    document.getElementById('statusFilter').addEventListener('change', loadInvoices);
    document.getElementById('addLineItemBtn').addEventListener('click', addLineItemRow);

    const billingBtn = document.getElementById('triggerBillingRunBtn');
    if (billingBtn) {
        billingBtn.addEventListener('click', async () => {
            if (!confirm('Run recurring billing now?')) return;
            try {
                const res = await window.api.post('/api/billing/run');
                alert(res.message);
                loadInvoices();
            } catch (err) {
                alert('Billing run error: ' + err.message);
            }
        });
    }

    const newForm = document.getElementById('newInvoiceForm');
    if (newForm) {
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rows = document.querySelectorAll('.line-item-row');
            const items = [];
            rows.forEach(r => {
                const desc = r.querySelector('.item-desc').value.trim();
                const qty = Number(r.querySelector('.item-qty').value) || 1;
                const price = Number(r.querySelector('.item-price').value) || 0;
                if (desc) items.push({ description: desc, quantity: qty, unit_price: price });
            });

            if (items.length === 0) {
                alert('At least one item is required');
                return;
            }

            const payload = {
                customer_id: document.getElementById('invCustomerSelect').value,
                invoice_date: document.getElementById('invDate').value,
                due_date: document.getElementById('invDueDate').value,
                tax_rate: Number(document.getElementById('invTaxRate').value) || 0,
                discount_amount: Number(document.getElementById('invDiscount').value) || 0,
                status: 'confirmed',
                items
            };

            try {
                await window.api.post('/api/invoices', payload);
                const modal = bootstrap.Modal.getInstance(document.getElementById('newInvoiceModal'));
                if (modal) modal.hide();
                newForm.reset();
                loadInvoices();
            } catch (err) {
                alert('Failed to create invoice: ' + err.message);
            }
        });
    }
});

