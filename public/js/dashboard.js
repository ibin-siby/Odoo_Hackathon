// Dashboard Analytics & Charts

let chartInstance = null;

async function loadDashboard() {
    try {
        // 1. Load Summary
        const summary = await window.api.get('/api/dashboard/summary');
        document.getElementById('totalRevenue').textContent = '₹' + Number(summary.total_revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        document.getElementById('outstandingAmount').textContent = '₹' + Number(summary.outstanding_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
        document.getElementById('activeSubscriptions').textContent = summary.active_subscriptions || 0;
        document.getElementById('overdueCount').textContent = summary.overdue_count || 0;

        // 2. Load Pipeline Stats
        const subStatsRes = await window.api.get('/api/dashboard/subscription-stats');
        const stats = subStatsRes.data || {};
        document.getElementById('pipeActive').textContent = stats.active || 0;
        document.getElementById('pipeConfirmed').textContent = stats.confirmed || 0;
        document.getElementById('pipeQuote').textContent = stats.quotation || 0;
        document.getElementById('pipeDraft').textContent = stats.draft || 0;
        document.getElementById('pipeClosed').textContent = stats.closed || 0;

        // 3. Load Payments Table
        const payments = await window.api.get('/api/payments');
        const payTable = document.getElementById('recentPaymentsTable');
        const recentPay = Array.isArray(payments) ? payments.slice(0, 5) : [];

        if (recentPay.length === 0) {
            payTable.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No payments recorded yet.</td></tr>`;
        } else {
            payTable.innerHTML = recentPay.map(p => `
                <tr>
                    <td>#${p.id}</td>
                    <td><strong>${p.customer_name || 'N/A'}</strong></td>
                    <td><a href="invoices.html">${p.invoice_number || 'N/A'}</a></td>
                    <td><strong class="text-success">₹${Number(p.amount).toFixed(2)}</strong></td>
                    <td><span class="badge bg-light text-dark border">${p.payment_method || 'Standard'}</span></td>
                    <td>${p.payment_date ? new Date(p.payment_date).toLocaleDateString() : '-'}</td>
                </tr>
            `).join('');
        }

        // 4. Load Overdue Table
        const overdueRes = await window.api.get('/api/dashboard/overdue');
        const overdueList = overdueRes.data || [];
        const overdueTable = document.getElementById('overdueTable');

        if (overdueList.length === 0) {
            overdueTable.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">🎉 No overdue invoices!</td></tr>`;
        } else {
            overdueTable.innerHTML = overdueList.slice(0, 5).map(o => `
                <tr>
                    <td><strong>${o.invoice_number}</strong></td>
                    <td>${o.customer_name}</td>
                    <td class="text-danger fw-bold">₹${Number(o.outstanding_amount).toFixed(2)}</td>
                    <td>
                        <div>${o.due_date}</div>
                        <span class="badge bg-danger text-white">${o.days_overdue} days late</span>
                    </td>
                </tr>
            `).join('');
        }

        // 5. Load Revenue Chart
        const revRes = await window.api.get('/api/dashboard/revenue');
        const revData = revRes.data || [];
        renderChart(revData);

    } catch (err) {
        console.error('Failed to load dashboard:', err);
    }
}

function renderChart(data) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    const labels = data.length > 0 ? data.map(d => d.month) : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const values = data.length > 0 ? data.map(d => Number(d.revenue)) : [0, 0, 0, 0, 0, 0, 0, 0, 2950, 3000];

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Revenue (₹)',
                data: values,
                backgroundColor: '#176B64',
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: val => '₹' + val.toLocaleString('en-IN')
                    },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Run Billing button
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();

    const runBtn = document.getElementById('runBillingBtn');
    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            if (!confirm('Execute recurring billing run now? All due subscriptions will generate invoices.')) {
                return;
            }
            try {
                runBtn.disabled = true;
                runBtn.innerHTML = '<span>⏳</span> Processing...';
                const res = await window.api.post('/api/billing/run');
                alert(res.message);
                loadDashboard();
            } catch (e) {
                alert('Billing run failed: ' + e.message);
            } finally {
                runBtn.disabled = false;
                runBtn.innerHTML = '<span>⚡</span> Run Automated Billing';
            }
        });
    }
});
