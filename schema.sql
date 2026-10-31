```sql
CREATE DATABASE IF NOT EXISTS subscription;
USE subscription;

-- 1. Roles
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- 3. Customers
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Products
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active'
);

-- 5. Plans
CREATE TABLE plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    billing_cycle ENUM('monthly','quarterly','yearly') NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active'
);

-- 6. Plan Products
CREATE TABLE plan_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    product_id INT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES plans(id),
    FOREIGN KEY (product_id) REFERENCES products(id),
    UNIQUE (plan_id, product_id)
);

-- 7. Taxes
CREATE TABLE taxes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rate DECIMAL(5,2) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active'
);

-- 8. Discounts
CREATE TABLE discounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    discount_type ENUM('percentage','fixed') NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    status ENUM('active','inactive') DEFAULT 'active'
);

-- 9. Subscriptions
CREATE TABLE subscriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    plan_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status ENUM('active','cancelled','expired','pending') DEFAULT 'pending',
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (plan_id) REFERENCES plans(id),
    INDEX idx_subscription_status (status)
);

-- 10. Subscription Items
CREATE TABLE subscription_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 11. Invoices
CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    subscription_id INT,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    outstanding_amount DECIMAL(12,2) NOT NULL,
    status ENUM('draft','confirmed','partially_paid','paid','cancelled') DEFAULT 'draft',
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    INDEX idx_invoice_due_status (due_date, status)
);

-- 12. Invoice Items
CREATE TABLE invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    product_id INT NOT NULL,
    description VARCHAR(255),
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 13. Payments
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    payment_method_id INT,
    amount DECIMAL(12,2) NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    note TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    INDEX idx_payment_invoice (invoice_id)
);

-- 14. Payment Methods
CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

-- 15. Subscription History
CREATE TABLE subscription_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subscription_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- 16. Invoice History
CREATE TABLE invoice_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- 17. Notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    customer_id INT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 18. Audit Logs
CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(150) NOT NULL,
    entity VARCHAR(100),
    entity_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```
