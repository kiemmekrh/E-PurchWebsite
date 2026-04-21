<?php
// File: includes/sidebar.php
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$module = basename(dirname($_SERVER['PHP_SELF']));
?>
<aside class="sidebar">
    <div class="sidebar-header">
        <div class="sidebar-logo">
            <div class="logo-small">IN</div>
            <div>
                <div class="sidebar-logo-text">E-Purch</div>
                <div class="sidebar-company">PT Niramas Utama (INACO)</div>
            </div>
        </div>
    </div>
    
    <nav>
        <ul class="nav-menu">
            <li class="nav-item">
                <a href="../dashboard/index.php" class="nav-link <?php echo $module === 'dashboard' ? 'active' : ''; ?>">
                    <span>🏠</span>
                    <span>Dashboard</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="../comparison/index.php" class="nav-link <?php echo $module === 'comparison' ? 'active' : ''; ?>">
                    <span>📊</span>
                    <span>Comparison Table</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="../invoice/index.php" class="nav-link <?php echo $module === 'invoice' ? 'active' : ''; ?>">
                    <span>📄</span>
                    <span>Invoice Tracker</span>
                </a>
            </li>
            <li class="nav-item">
                <a href="../tracking/index.php" class="nav-link <?php echo $module === 'tracking' ? 'active' : ''; ?>">
                    <span>📦</span>
                    <span>PO & GR Tracking</span>
                </a>
            </li>
            <?php if ($_SESSION['role'] === 'admin'): ?>
            <li class="nav-item">
                <a href="../master/index.php" class="nav-link <?php echo $module === 'master' ? 'active' : ''; ?>">
                    <span>⚙️</span>
                    <span>Master Data</span>
                </a>
            </li>
            <?php endif; ?>
        </ul>
    </nav>
    
    <div class="sidebar-footer">
        <div class="user-profile">
            <div class="user-avatar"><?php echo strtoupper(substr($_SESSION['name'], 0, 1)); ?></div>
            <div class="user-info">
                <div class="user-name"><?php echo htmlspecialchars($_SESSION['name']); ?></div>
                <div class="user-role"><?php echo ucwords(str_replace('_', ' ', $_SESSION['role'])); ?></div>
            </div>
        </div>
        <button class="logout-btn" onclick="location.href='../../auth/logout.php'">
            <span>🚪</span>
            <span>Logout</span>
        </button>
    </div>
</aside>