const productForm = document.getElementById("productForm");
const productsTable = document.getElementById("productsTable");
const message = document.getElementById("message");
const refreshButton = document.getElementById("refreshButton");

let editingProductId = null;

// Create Cancel Edit button
const cancelButton = document.createElement("button");
cancelButton.type = "button";
cancelButton.textContent = "Cancel Edit";
cancelButton.style.display = "none";
productForm.appendChild(cancelButton);

// Load products
async function loadProducts() {
    try {
        const response = await fetch("/api/products");
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load products");
        }

        productsTable.innerHTML = "";

        result.data.forEach(product => {
            const row = document.createElement("tr");

            const values = [
                product.id,
                product.name,
                product.description || "-",
                Number(product.price).toFixed(2),
                product.status
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });

            // Actions column
            const actionsCell = document.createElement("td");

            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Edit";
            editButton.addEventListener("click", () => editProduct(product));

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.style.marginLeft = "6px";
            deleteButton.addEventListener("click", () => deleteProduct(product.id));

            actionsCell.appendChild(editButton);
            actionsCell.appendChild(deleteButton);
            row.appendChild(actionsCell);

            productsTable.appendChild(row);
        });

        message.textContent = result.data.length > 0
            ? "Products loaded successfully!"
            : "No products found.";

    } catch (error) {
        message.textContent = "Error loading products: " + error.message;
        console.error(error);
    }
}

// Add or update product
productForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const product = {
        name: document.getElementById("name").value.trim(),
        description: document.getElementById("description").value.trim(),
        price: Number(document.getElementById("price").value),
        status: document.getElementById("status").value
    };

    try {
        const url = editingProductId
            ? `/api/products/${editingProductId}`
            : "/api/products";

        const method = editingProductId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(product)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Operation failed");
        }

        message.textContent = editingProductId
            ? "Product updated successfully!"
            : "Product added successfully!";

        productForm.reset();
        editingProductId = null;
        cancelButton.style.display = "none";
        productForm.querySelector("button[type='submit']").textContent = "Add Product";

        await loadProducts();

    } catch (error) {
        message.textContent = "Error: " + error.message;
        console.error(error);
    }
});

// Edit product
function editProduct(product) {
    editingProductId = product.id;

    document.getElementById("name").value = product.name;
    document.getElementById("description").value = product.description || "";
    document.getElementById("price").value = product.price;
    document.getElementById("status").value = product.status;

    productForm.querySelector("button[type='submit']").textContent = "Update Product";
    cancelButton.style.display = "inline-block";

    message.textContent = "Editing product: " + product.name;
}

// Cancel editing
cancelButton.addEventListener("click", function() {
    productForm.reset();
    editingProductId = null;

    productForm.querySelector("button[type='submit']").textContent = "Add Product";
    cancelButton.style.display = "none";

    message.textContent = "Edit cancelled.";
});

// Delete product
async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${id}`, {
            method: "DELETE"
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to delete product");
        }

        await loadProducts();
        message.textContent = "Product deleted successfully!";

    } catch (error) {
        message.textContent = "Error deleting product: " + error.message;
        console.error(error);
    }
}

// Refresh products
refreshButton.addEventListener("click", loadProducts);

// Initial load
loadProducts();