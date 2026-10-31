// Products Management

let allProducts = [];

async function loadProducts() {
    try {
        const res = await window.api.get('/api/products');
        allProducts = res.data || [];
        renderProducts(allProducts);
    } catch (err) {
        console.error('Error loading products:', err);
    }
}

function renderProducts(products) {
    const tbody = document.getElementById('productsTable');
    if (!tbody) return;

    if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No products configured yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td>#${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td><span class="text-muted small">${p.description || '-'}</span></td>
            <td><strong>₹${Number(p.price).toFixed(2)}</strong></td>
            <td><span class="badge-status status-${p.status}">${p.status}</span></td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-secondary btn-sm" onclick="editProduct(${p.id})">Edit</button>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function prepareAddProduct() {
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('productId').value = '';
    document.getElementById('name').value = '';
    document.getElementById('description').value = '';
    document.getElementById('price').value = '';
    document.getElementById('status').value = 'active';
}

function editProduct(id) {
    const p = allProducts.find(item => item.id === id);
    if (!p) return;

    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = p.id;
    document.getElementById('name').value = p.name;
    document.getElementById('description').value = p.description || '';
    document.getElementById('price').value = Number(p.price).toFixed(2);
    document.getElementById('status').value = p.status || 'active';

    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
        await window.api.delete(`/api/products/${id}`);
        loadProducts();
    } catch (err) {
        alert(err.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    const form = document.getElementById('productForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('productId').value;
            const payload = {
                name: document.getElementById('name').value.trim(),
                description: document.getElementById('description').value.trim(),
                price: Number(document.getElementById('price').value),
                status: document.getElementById('status').value
            };

            try {
                if (id) {
                    await window.api.put(`/api/products/${id}`, payload);
                } else {
                    await window.api.post('/api/products', payload);
                }

                const modalEl = document.getElementById('productModal');
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                form.reset();
                loadProducts();
            } catch (err) {
                alert('Save error: ' + err.message);
            }
        });
    }
});
