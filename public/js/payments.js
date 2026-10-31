// Payments & Collections

let unpaidInvoices = [];

async function loadPayments() {
    try {
        const payments = await window.api.get('/api/payments');
        renderPaymentsTable(Array.isArray(payments) ? payments : []);
    } catch (err) {
        console.error('Failed to load payments:', err);
    }
}

function renderPaymentsTable(payments) {
    const tbody = document.getElementById('paymentsTableBody');
    const countText = document.getElementById('payCountText');
    if (countText) countText.textContent = `${payments.length} total payments recorded`;

    if (!tbody) return;

    if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No payments recorded yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = payments.map(p => `
        <tr>
            <td><strong>#${p.id}</strong></td>
            <td><strong>${p.customer_name || 'N/A'}</strong></td>
            <td><a href="invoices.html">${p.invoice_number || 'N/A'}</a></td>
            <td><strong class="text-success fs-6">₹${Number(p.amount).toFixed(2)}</strong></td>
            <td><span class="badge bg-light text-dark border">${p.payment_method || 'Standard'}</span></td>
            <td>${p.payment_date ? new Date(p.payment_date).toLocaleString() : '-'}</td>
            <td><span class="text-muted small">${p.note || '-'}</span></td>
        </tr>
    `).join('');
}

// Populate Unpaid Invoices in Payment Modal
async function populateUnpaidInvoices() {
    try {
        const res = await window.api.get('/api/invoices');
        const invoices = res.data || [];
        unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && Number(i.outstanding_amount) > 0);

        const select = document.getElementById('payInvoiceSelect');
        if (!select) return;

        select.innerHTML = '<option value="">Select an invoice to pay...</option>' + 
            unpaidInvoices.map(i => `
                <option value="${i.id}">
                    ${i.invoice_number} - ${i.customer_name} (Due: ₹${Number(i.outstanding_amount).toFixed(2)})
                </option>
            `).join('');

        select.addEventListener('change', (e) => {
            const invId = parseInt(e.target.value, 10);
            const found = unpaidInvoices.find(i => i.id === invId);
            const notice = document.getElementById('invoiceBalanceNotice');

            if (found) {
                document.getElementById('noticeTotal').textContent = `₹${Number(found.total_amount).toFixed(2)}`;
                document.getElementById('noticePaid').textContent = `₹${Number(found.paid_amount || 0).toFixed(2)}`;
                document.getElementById('noticeOutstanding').textContent = `₹${Number(found.outstanding_amount).toFixed(2)}`;
                document.getElementById('payAmount').value = Number(found.outstanding_amount).toFixed(2);
                document.getElementById('payAmount').max = Number(found.outstanding_amount);
                notice.style.display = 'block';
            } else {
                notice.style.display = 'none';
                document.getElementById('payAmount').value = '';
            }
        });

    } catch (err) {
        console.error('Failed to populate invoices in payment modal:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadPayments();
    populateUnpaidInvoices();

    const form = document.getElementById('recordPaymentForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const invoiceId = document.getElementById('payInvoiceSelect').value;
            const amount = Number(document.getElementById('payAmount').value);
            const methodId = document.getElementById('payMethodSelect').value;
            const note = document.getElementById('payNote').value.trim();

            const selectedInv = unpaidInvoices.find(i => i.id === parseInt(invoiceId, 10));
            if (selectedInv && amount > Number(selectedInv.outstanding_amount)) {
                alert(`Payment amount ₹${amount} exceeds the outstanding balance ₹${selectedInv.outstanding_amount}. Overpayment is prohibited.`);
                return;
            }

            try {
                const res = await window.api.post('/api/payments', {
                    invoice_id: invoiceId,
                    amount,
                    payment_method_id: methodId,
                    note
                });

                alert(`Payment of ₹${amount} recorded successfully! Status: ${res.invoice_status}`);
                const modal = bootstrap.Modal.getInstance(document.getElementById('newPaymentModal'));
                if (modal) modal.hide();
                form.reset();
                document.getElementById('invoiceBalanceNotice').style.display = 'none';
                loadPayments();
                populateUnpaidInvoices();
            } catch (err) {
                alert('Payment recording failed: ' + err.message);
            }
        });
    }
});
