// Shared Role-Aware Brightloop Navigation Bar

function renderNavbar() {
    const user = (window.api && window.api.getUser()) || {};
    const role = (user.role || '').toLowerCase();
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';

    const isCustomer = role === 'customer' || role === 'user';
    const isAdmin = role === 'admin';
    const isStaffOrAdmin = isAdmin || role === 'staff' || role === 'manager';

    const navItems = [];

    if (isCustomer) {
        navItems.push({ href: 'portal.html', label: 'Customer Portal', id: 'portal.html' });
    } else {
        navItems.push({ href: 'dashboard.html', label: 'Dashboard', id: 'dashboard.html' });
        navItems.push({ href: 'subscriptions.html', label: 'Subscriptions', id: 'subscriptions.html' });
        navItems.push({ href: 'invoices.html', label: 'Invoices', id: 'invoices.html' });
        navItems.push({ href: 'payments.html', label: 'Payments', id: 'payments.html' });
        navItems.push({ href: 'products.html', label: 'Products', id: 'products.html' });
        navItems.push({ href: 'plans.html', label: 'Plans', id: 'plans.html' });
        navItems.push({ href: 'templates.html', label: 'Templates', id: 'templates.html' });
    }

    const navLinksHtml = navItems.map(item => `
        <li class="nav-item">
            <a class="nav-link ${currentPath === item.id ? 'active' : ''}" href="${item.href}">
                ${item.label}
            </a>
        </li>
    `).join('');

    const navbarHtml = `
    <nav class="navbar navbar-expand-lg top-nav py-2">
        <div class="container-fluid px-4">
            <a class="navbar-brand brand-logo me-4" href="${isCustomer ? 'portal.html' : 'dashboard.html'}">
                <span>Brightloop</span>
                <span class="brand-badge">${role ? role.toUpperCase() : 'APP'}</span>
            </a>

            <button class="navbar-toggler text-white border-0" type="button" data-bs-toggle="collapse" data-bs-target="#brightloopNav">
                <span class="navbar-toggler-icon"></span>
            </button>

            <div class="collapse navbar-collapse" id="brightloopNav">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0 gap-1">
                    ${navLinksHtml}
                </ul>

                <div class="d-flex align-items-center gap-3">
                    ${!isCustomer ? `
                        <button class="btn btn-outline-light btn-sm px-3 rounded-pill d-none d-md-flex align-items-center gap-2" id="triggerCommandPalette" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2);">
                            <span>🔍 Search anything...</span>
                            <kbd style="background: rgba(0,0,0,0.3); border: 0; font-size: 11px;">Ctrl + K</kbd>
                        </button>
                    ` : ''}

                    <div class="dropdown">
                        <button class="btn btn-sm text-white dropdown-toggle d-flex align-items-center gap-2" type="button" id="userMenuBtn" data-bs-toggle="dropdown">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--coral); color: white; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                                ${(user.name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span class="d-none d-sm-inline fw-semibold">${user.name || 'Account'}</span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0 mt-2" style="border-radius: var(--radius-sm);">
                            <li class="px-3 py-2 text-muted small border-bottom">
                                Signed in as <strong>${user.email || 'User'}</strong>
                            </li>
                            ${isCustomer ? `
                                <li><a class="dropdown-item" href="portal.html">My Portal</a></li>
                            ` : `
                                <li><a class="dropdown-item" href="dashboard.html">Dashboard</a></li>
                                <li><a class="dropdown-item" href="subscriptions.html">Subscriptions</a></li>
                                <li><a class="dropdown-item" href="invoices.html">Invoices</a></li>
                            `}
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item text-danger" id="globalLogoutBtn">Logout</button></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </nav>
    `;

    const container = document.getElementById('navbar-container');
    if (container) {
        container.innerHTML = navbarHtml;
    } else {
        const div = document.createElement('div');
        div.id = 'navbar-container';
        div.innerHTML = navbarHtml;
        document.body.prepend(div);
    }

    // Attach logout event
    const logoutBtn = document.getElementById('globalLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (window.api) window.api.clearAuth();
            window.location.href = 'login.html';
        });
    }

    // Attach command palette click trigger
    const cmdTrigger = document.getElementById('triggerCommandPalette');
    if (cmdTrigger && window.openCommandPalette) {
        cmdTrigger.addEventListener('click', window.openCommandPalette);
    }
}

document.addEventListener('DOMContentLoaded', renderNavbar);
