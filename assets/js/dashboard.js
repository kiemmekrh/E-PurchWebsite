// File: assets/js/dashboard.js

// ─── CHART INSTANCES ──────────────────────────────────────────────────────────
let chartStatus   = null;
let chartStacked  = null;

// ─── ACTIVE VENDOR FILTER ─────────────────────────────────────────────────────
let activeVendor = 'all';

// ─── LOAD DASHBOARD ───────────────────────────────────────────────────────────
function loadDashboardCharts(vendor) {
    vendor = vendor || activeVendor || 'all';
    const params = new URLSearchParams({ vendor });

    fetch(`api/get_dashboard_data.php?${params}`)
        .then(r => r.json())
        .then(data => {
            if (!data.success) return;
            updateStats(data.stats);
            renderStatusDonut(data.stats);
            renderSupplierStacked(data.supplier_stacks);
            populateVendorDropdown(data.vendor_list);
        })
        .catch(err => {
            showToast('Connection error. Please refresh the page.', 'error');
            console.error(err);
        });
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats(stats) {
    document.getElementById('totalPO').textContent     = (stats.total     || 0).toLocaleString('id-ID');
    document.getElementById('openPO').textContent      = (stats.open      || 0).toLocaleString('id-ID');
    document.getElementById('partialPO').textContent   = (stats.partial   || 0).toLocaleString('id-ID');
    document.getElementById('completedPO').textContent = (stats.completed || 0).toLocaleString('id-ID');
}

// ─── VENDOR FILTER ────────────────────────────────────────────────────────────
function populateVendorDropdown(vendors) {
    const sel = document.getElementById('vendorFilterSelect');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '<option value="all">— All Vendors —</option>' +
        vendors.map(v => `<option value="${escDash(v)}"${v === current ? ' selected' : ''}>${v}</option>`).join('');
}

function applyVendorFilter() {
    const sel = document.getElementById('vendorFilterSelect');
    activeVendor = sel.value || 'all';

    const badge     = document.getElementById('vendorBadge');
    const badgeName = document.getElementById('vendorBadgeName');

    if (activeVendor !== 'all') {
        badgeName.textContent = activeVendor;
        badge.classList.add('visible');
    } else {
        badge.classList.remove('visible');
    }

    loadDashboardCharts(activeVendor);
}

function clearVendorFilter() {
    activeVendor = 'all';
    const sel = document.getElementById('vendorFilterSelect');
    if (sel) sel.value = 'all';
    document.getElementById('vendorBadge')?.classList.remove('visible');
    loadDashboardCharts('all');
}

function escDash(str) {
    return (str || '').replace(/"/g, '&quot;');
}

// ── Chart 1: PO Status Donut ──────────────────────────────────────────────────
function renderStatusDonut(stats) {
    const ctx = document.getElementById('chartPOStatus')?.getContext('2d');
    if (!ctx) return;
    if (chartStatus) chartStatus.destroy();

    const total = (stats.open || 0) + (stats.partial || 0) + (stats.completed || 0);

    chartStatus = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Open', 'Partial', 'Completed'],
            datasets: [{
                data: [stats.open || 0, stats.partial || 0, stats.completed || 0],
                backgroundColor: ['#f4c542', '#4e9af1', '#28a745'],
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 8,
            }]
        },
        options: {
            responsive: true,
            cutout: '65%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => {
                            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                            return ` ${ctx.label}: ${ctx.parsed.toLocaleString('id-ID')} PO (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ── Chart 2: Stacked Bar — PO per Supplier (Open / Partial / Completed) ───────
function renderSupplierStacked(supplierStacks) {
    // Always destroy old chart first
    if (chartStacked) { chartStacked.destroy(); chartStacked = null; }

    // Rebuild the canvas fresh every time to avoid stale style/size bugs
    const wrap = document.getElementById('supplierStackedWrap');
    if (!wrap) return;
    wrap.innerHTML = '<canvas id="chartSupplierStacked" style="height:380px; display:block;"></canvas>';
    const ctx = document.getElementById('chartSupplierStacked').getContext('2d');

    if (!supplierStacks || supplierStacks.length === 0) {
        wrap.innerHTML = '<div style="text-align:center;color:#aaa;padding:60px 0;font-size:14px;">No data available</div>';
        return;
    }

    // Sort by total desc
    const sorted = [...supplierStacks].sort(
        (a, b) => parseInt(b.total_count) - parseInt(a.total_count)
    );

    const maxLabelLen = 16;
    const labels     = sorted.map(s => {
        const n = s.supplier_name || 'Unknown';
        return n.length > maxLabelLen ? n.slice(0, maxLabelLen) + '…' : n;
    });
    const fullLabels = sorted.map(s => s.supplier_name || 'Unknown');
    const opens      = sorted.map(s => parseInt(s.open_count)      || 0);
    const partials   = sorted.map(s => parseInt(s.partial_count)   || 0);
    const completeds = sorted.map(s => parseInt(s.completed_count) || 0);

    // Dynamic canvas width — min 80px per bar so labels have room
    const perBar    = Math.max(72, Math.floor(wrap.clientWidth / Math.max(sorted.length, 1)));
    const totalW    = Math.max(wrap.clientWidth || 600, sorted.length * perBar);
    ctx.canvas.style.width  = totalW + 'px';
    ctx.canvas.style.minWidth = totalW + 'px';
    ctx.canvas.width = totalW;

    chartStacked = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Open',
                    data: opens,
                    backgroundColor: '#f4c542',
                    borderSkipped: false,
                },
                {
                    label: 'Partial',
                    data: partials,
                    backgroundColor: '#4e9af1',
                    borderSkipped: false,
                },
                {
                    label: 'Completed',
                    data: completeds,
                    backgroundColor: '#28a745',
                    borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
                    borderSkipped: false,
                },
            ]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 13, font: { size: 12 }, padding: 18 }
                },
                tooltip: {
                    callbacks: {
                        title: items => fullLabels[items[0].dataIndex] || items[0].label,
                        label: c => ` ${c.dataset.label}: ${c.parsed.y} PO`,
                        footer: items => `Total: ${items.reduce((s, i) => s + i.parsed.y, 0)} PO`
                    }
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: { display: false },
                    ticks: {
                        font: { size: 10 },
                        maxRotation: 40,
                        minRotation: 20,
                        // Always use the short label (already truncated)
                        callback: function(val, idx) { return labels[idx]; }
                    }
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: { precision: 0, font: { size: 11 } },
                    grid: { color: '#f0f0f0' },
                    title: { display: true, text: 'Number of POs', font: { size: 11 }, color: '#888' }
                }
            }
        }
    });
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const existing = document.getElementById('toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
        position:fixed; bottom:30px; right:30px; padding:14px 22px;
        border-radius:8px; font-size:14px; font-weight:500; color:white;
        z-index:9999; box-shadow:0 4px 12px rgba(0,0,0,0.2);
        background:${type === 'success' ? '#28a745' : '#dc3545'};
        animation: fadeInToast 0.3s ease;
    `;
    toast.textContent = message;
    const style = document.createElement('style');
    style.textContent = `@keyframes fadeInToast { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
    loadDashboardCharts('all');
});