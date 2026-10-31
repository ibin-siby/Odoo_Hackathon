// Quotation Templates Management

let allTemplates = [];
let availableProducts = [];

async function loadTemplates() {
    try {
        const [tmplRes, prodRes] = await Promise.all([
            window.api.get('/api/templates'),
            window.api.get('/api/products')
        ]);
        allTemplates = tmplRes.data || [];
        availableProducts = prodRes.data || [];
        renderTemplates(allTemplates);
    } catch (err) {
        console.error('Failed to load templates:', err);
    }
}

function renderTemplates(templates) {
    const tbody = document.getElementById('templatesTable');
    if (!tbody) return;

    if (templates.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">No quotation templates configured yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = templates.map(t => {
        const productPills = (t.lines || []).map(l => `
            <span class="badge bg-light text-dark border p-1 px-2 me-1 mb-1" style="font-size: 11px;">
                ${l.product_name} (x${l.quantity}) - ₹${Number(l.unit_price).toFixed(2)}
            </span>
        `).join('') || '<span class="text-muted small">No products</span>';

        return `
            <tr>
                <td><strong>${t.name}</strong></td>
                <td><span class="text-muted small">${t.description || '-'}</span></td>
                <td><span class="badge bg-info-subtle text-info-emphasis border">${t.validity_days || 30} Days</span></td>
                <td><div class="d-flex flex-wrap">${productPills}</div></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteTemplate(${t.id})">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function prepareAddTemplate() {
    document.getElementById('tmplName').value = '';
    document.getElementById('tmplValidity').value = 30;
    document.getElementById('tmplDescription').value = '';
    const container = document.getElementById('tmplLinesContainer');
    container.innerHTML = '';
    addTemplateLineRow();
}

function addTemplateLineRow() {
    const container = document.getElementById('tmplLinesContainer');
    const row = document.createElement('div');
    row.className = 'row g-2 align-items-center tmpl-line-row';

    const prodOptions = availableProducts.map(p => `
        <option value="${p.id}" data-price="${p.price}">${p.name} (₹${Number(p.price).toFixed(2)})</option>
    `).join('');

    row.innerHTML = `
        <div class="col-md-6">
            <select class="form-select form-select-sm tmpl-prod-select" required>
                <option value="">Select product...</option>
                ${prodOptions}
            </select>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control form-control-sm tmpl-qty" value="1" min="1" placeholder="Qty" required>
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control form-control-sm tmpl-price" placeholder="Price (₹)" step="0.01" min="0" required>
        </div>
        <div class="col-md-1 text-center">
            <button type="button" class="btn btn-sm text-danger remove-tmpl-line">✕</button>
        </div>
    `;

    const select = row.querySelector('.tmpl-prod-select');
    const priceInput = row.querySelector('.tmpl-price');

    select.addEventListener('change', () => {
        const opt = select.selectedOptions[0];
        if (opt && opt.getAttribute('data-price')) {
            priceInput.value = Number(opt.getAttribute('data-price')).toFixed(2);
        }
    });

    row.querySelector('.remove-tmpl-line').addEventListener('click', () => {
        if (document.querySelectorAll('.tmpl-line-row').length > 1) {
            row.remove();
        }
    });

    container.appendChild(row);
}

async function deleteTemplate(id) {
    if (!confirm('Delete this quotation template?')) return;
    try {
        await window.api.delete(`/api/templates/${id}`);
        loadTemplates();
    } catch (err) {
        alert(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadTemplates();

    document.getElementById('addTmplLineBtn').addEventListener('click', addTemplateLineRow);

    const form = document.getElementById('templateForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rows = document.querySelectorAll('.tmpl-line-row');
            const lines = [];
            rows.forEach(r => {
                const prodId = r.querySelector('.tmpl-prod-select').value;
                const qty = Number(r.querySelector('.tmpl-qty').value) || 1;
                const price = Number(r.querySelector('.tmpl-price').value) || 0;
                if (prodId) {
                    lines.push({ product_id: parseInt(prodId, 10), quantity: qty, unit_price: price });
                }
            });

            if (lines.length === 0) {
                alert('Please add at least one product line.');
                return;
            }

            const payload = {
                name: document.getElementById('tmplName').value.trim(),
                validity_days: parseInt(document.getElementById('tmplValidity').value, 10) || 30,
                description: document.getElementById('tmplDescription').value.trim(),
                lines
            };

            try {
                await window.api.post('/api/templates', payload);
                const modal = bootstrap.Modal.getInstance(document.getElementById('templateModal'));
                if (modal) modal.hide();
                loadTemplates();
            } catch (err) {
                alert('Save error: ' + err.message);
            }
        });
    }
});

