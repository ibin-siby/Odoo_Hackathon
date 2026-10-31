// Global Command Palette (Ctrl + K)

(function() {
    const commands = [
        { label: '📊 Go to Dashboard', href: 'dashboard.html', keywords: 'dashboard stats metrics revenue home' },
        { label: '📋 View Subscriptions (Kanban)', href: 'subscriptions.html', keywords: 'subscriptions kanban pipeline contracts' },
        { label: '⚡ Run Automated Billing', action: 'runBilling', keywords: 'billing run recurring generate invoices engine' },
        { label: '🧾 View Invoices', href: 'invoices.html', keywords: 'invoices bills due unpaid payment' },
        { label: '💳 View Payments', href: 'payments.html', keywords: 'payments transactions money collected' },
        { label: '📦 Product Catalog', href: 'products.html', keywords: 'products catalog pricing items' },
        { label: '📑 Subscription Plans', href: 'plans.html', keywords: 'plans tiers monthly yearly pricing' },
        { label: '📝 Quotation Templates', href: 'templates.html', keywords: 'templates quotations quote bundles' },
        { label: '👤 Customer Portal', href: 'portal.html', keywords: 'portal customer client my' }
    ];

    function createPalette() {
        if (document.getElementById('command-palette-backdrop')) return;

        const paletteHtml = `
        <div id="command-palette-backdrop" class="command-palette-backdrop">
            <div class="command-palette-modal" onclick="event.stopPropagation()">
                <input type="text" id="command-palette-input" class="command-palette-input" placeholder="Type a command or search page (e.g. 'billing', 'kanban')..." autocomplete="off">
                <div id="command-palette-results" class="command-palette-results">
                    <!-- results rendered here -->
                </div>
                <div class="p-2 border-top bg-light text-muted small d-flex justify-content-between px-3">
                    <span>Use <strong>↑</strong> <strong>↓</strong> to navigate, <strong>Enter</strong> to select</span>
                    <span><strong>Esc</strong> to close</span>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', paletteHtml);

        const backdrop = document.getElementById('command-palette-backdrop');
        const input = document.getElementById('command-palette-input');

        backdrop.addEventListener('click', closePalette);

        input.addEventListener('input', (e) => {
            renderResults(e.target.value);
        });

        input.addEventListener('keydown', handleKeyNavigation);
    }

    let selectedIndex = 0;
    let filteredCommands = [];

    function renderResults(filter = '') {
        const resultsEl = document.getElementById('command-palette-results');
        const q = filter.trim().toLowerCase();

        filteredCommands = commands.filter(c => {
            return !q || c.label.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q);
        });

        selectedIndex = 0;

        if (filteredCommands.length === 0) {
            resultsEl.innerHTML = `<div class="p-3 text-center text-muted">No commands found matching "${filter}"</div>`;
            return;
        }

        resultsEl.innerHTML = filteredCommands.map((cmd, idx) => `
            <div class="command-palette-item ${idx === 0 ? 'selected' : ''}" data-index="${idx}">
                <span>${cmd.label}</span>
                <span class="badge bg-light text-muted border">Jump</span>
            </div>
        `).join('');

        // Attach click handlers
        resultsEl.querySelectorAll('.command-palette-item').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.getAttribute('data-index'), 10);
                executeCommand(filteredCommands[idx]);
            });
        });
    }

    function handleKeyNavigation(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                selectedIndex = (selectedIndex + 1) % filteredCommands.length;
                updateSelection();
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (filteredCommands.length > 0) {
                selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
                updateSelection();
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredCommands[selectedIndex]) {
                executeCommand(filteredCommands[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            closePalette();
        }
    }

    function updateSelection() {
        const items = document.querySelectorAll('.command-palette-item');
        items.forEach((item, idx) => {
            if (idx === selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    async function executeCommand(cmd) {
        closePalette();
        if (cmd.action === 'runBilling') {
            if (confirm('Run recurring billing cycle now?')) {
                try {
                    const res = await window.api.post('/api/billing/run');
                    alert(`Billing run completed! Invoices created: ${res.data.invoices_created}`);
                    if (window.location.pathname.includes('invoices') || window.location.pathname.includes('dashboard')) {
                        window.location.reload();
                    }
                } catch (e) {
                    alert('Billing error: ' + e.message);
                }
            }
        } else if (cmd.href) {
            window.location.href = cmd.href;
        }
    }

    function openPalette() {
        createPalette();
        const backdrop = document.getElementById('command-palette-backdrop');
        const input = document.getElementById('command-palette-input');
        backdrop.classList.add('show');
        input.value = '';
        renderResults('');
        setTimeout(() => input.focus(), 50);
    }

    function closePalette() {
        const backdrop = document.getElementById('command-palette-backdrop');
        if (backdrop) backdrop.classList.remove('show');
    }

    window.openCommandPalette = openPalette;
    window.closeCommandPalette = closePalette;

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openPalette();
        }
        if (e.key === 'Escape') {
            closePalette();
        }
    });
})();
