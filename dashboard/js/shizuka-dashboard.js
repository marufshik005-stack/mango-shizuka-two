// Shizuka Bot Dashboard JavaScript
class ShizukaDashboard {
    constructor() {
        this.refreshInterval = null;
        this.particleInterval = null;
        this.isLoading = false;
        this.botStatus = 'checking';
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Prevent multiple initializations
        if (this.initialized) return;
        this.initialized = true;
        
        // Auto-refresh stats every 30 seconds
        this.startAutoRefresh();
        
        // Initialize particles
        this.createParticles();
        
        // Load initial data
        this.loadDashboardData();
    }

    // Show loading overlay
    showLoading(message = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = overlay.querySelector('p');
        loadingText.textContent = message;
        overlay.classList.add('show');
        this.isLoading = true;
    }

    // Hide loading overlay
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
        this.isLoading = false;
    }

    // Show notification
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas ${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Auto-remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notificationSlideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-times-circle';
            case 'warning': return 'fa-exclamation-triangle';
            default: return 'fa-info-circle';
        }
    }

    // Create floating particles
    createParticles() {
        const container = document.getElementById('particles-bg');
        
        // Clear existing particles
        container.innerHTML = '';
        
        // Create new particles
        for (let i = 0; i < 15; i++) {
            setTimeout(() => this.createParticle(), i * 500);
        }
        
        // Recreate particles periodically
        this.particleInterval = setInterval(() => {
            this.createParticle();
        }, 2000);
    }

    createParticle() {
        const container = document.getElementById('particles-bg');
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random properties
        const size = Math.random() * 6 + 2;
        const left = Math.random() * window.innerWidth;
        const duration = Math.random() * 3 + 5;
        
        particle.style.cssText = `
            left: ${left}px;
            width: ${size}px;
            height: ${size}px;
            animation-duration: ${duration}s;
            animation-delay: ${Math.random() * 2}s;
        `;
        
        container.appendChild(particle);
        
        // Remove after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, (duration + 2) * 1000);
    }

    // Load dashboard data
    async loadDashboardData() {
        try {
            await Promise.all([
                this.updateStats(),
                this.updateSystemInfo(),
                this.updateCookieStatus()
            ]);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Failed to load some dashboard data', 'warning');
        }
    }


    // Update status indicator in header
    updateStatusIndicator(status, message) {
        const statusElement = document.getElementById('botStatus');
        const statusDot = statusElement.querySelector('.status-dot');
        const statusText = statusElement.querySelector('span');
        
        // Remove all status classes
        statusDot.className = 'status-dot';
        
        // Add appropriate status class
        statusDot.classList.add(status);
        statusText.textContent = message || this.getStatusText(status);
    }

    getStatusText(status) {
        switch (status) {
            case 'online': return 'Bot Online';
            case 'offline': return 'Bot Offline';
            case 'warning': return 'Bot Warning';
            case 'starting': return 'Starting...';
            case 'stopping': return 'Stopping...';
            default: return 'Unknown Status';
        }
    }

    // Update uptime display
    updateUptime(seconds) {
        if (!seconds) return;
        
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        let uptimeText = '';
        if (days > 0) uptimeText += `${days}d `;
        if (hours > 0) uptimeText += `${hours}h `;
        uptimeText += `${minutes}m`;
        
        document.getElementById('uptimeDisplay').textContent = uptimeText;
    }

    // Update statistics
    async updateStats() {
        try {
            const response = await fetch('/api/stats');
            const data = await response.json();
            
            if (response.ok) {
                // Update thread count
                const threadCount = data.totalThreads || 0;
                document.getElementById('threadCount').textContent = threadCount;
                
                // Update user count
                const userCount = data.totalUsers || 0;
                document.getElementById('userCount').textContent = userCount;
                
                // Update memory usage
                if (data.memoryUsage) {
                    document.getElementById('memoryUsage').textContent = data.memoryUsage;
                }
                
                // Update uptime
                if (data.uptime) {
                    this.updateUptime(data.uptime);
                }
                
                // Update status based on bot ready and login status
                let status = 'offline';
                let statusMessage = 'Bot Offline';
                
                if (data.botReady) {
                    if (data.isLoggedIn) {
                        status = 'online';
                        statusMessage = 'Bot Online';
                    } else {
                        status = 'warning';
                        statusMessage = 'Bot Starting...';
                    }
                }
                
                this.updateStatusIndicator(status, statusMessage);
                
                // Log stats source for debugging
                if (data.statsSource) {
                    console.log(`Stats loaded from: ${data.statsSource}`);
                    if (data.statsSource === 'file' && (threadCount === 0 || userCount === 0)) {
                        console.log('Zero counts detected despite file source - bot may be initializing');
                    }
                }
                
            } else {
                throw new Error(data.message || 'Failed to fetch stats');
            }
            
        } catch (error) {
            console.error('Stats update error:', error);
            document.getElementById('threadCount').textContent = '--';
            document.getElementById('userCount').textContent = '--';
            document.getElementById('memoryUsage').textContent = '--';
            this.updateStatusIndicator('offline', 'Connection Error');
        }
    }


    // Update system information
    async updateSystemInfo() {
        try {
            const response = await fetch('/api/system-info');
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('nodeVersion').textContent = data.nodeVersion || '--';
                document.getElementById('platform').textContent = data.platform || '--';
                document.getElementById('cpuUsage').textContent = data.cpuUsage || '--';
                document.getElementById('lastRestart').textContent = data.lastRestart || '--';
            }
        } catch (error) {
            console.error('System info update error:', error);
        }
    }

    // Update cookie status
    async updateCookieStatus() {
        try {
            const response = await fetch('/api/cookie-status');
            const data = await response.json();
            
            if (response.ok) {
                document.getElementById('cookieAge').textContent = data.age || '--';
                document.getElementById('cookieLastUpdated').textContent = data.lastUpdated || '--';
                
                const statusBadge = document.getElementById('cookieValidStatus');
                statusBadge.textContent = data.isValid ? 'Valid' : 'Invalid';
                statusBadge.className = `status-badge ${data.isValid ? 'valid' : 'invalid'}`;
            }
        } catch (error) {
            console.error('Cookie status update error:', error);
        }
    }

    // Start auto-refresh
    startAutoRefresh() {
        // Clear existing interval
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Start new interval
        this.refreshInterval = setInterval(() => {
            if (!this.isLoading) {
                this.loadDashboardData();
            }
        }, 30000); // 30 seconds
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }
}

// Initialize dashboard instance
const dashboard = new ShizukaDashboard();

// Global helper function for refresh button
function refreshStats() {
    dashboard.updateStats();
    dashboard.showNotification('Stats refreshed', 'success', 2000);
}

// Bot control functions
async function controlBot(action) {
    if (dashboard.isLoading) return;
    
    dashboard.showLoading(`${action.charAt(0).toUpperCase() + action.slice(1)}ing bot...`);
    
    try {
        const response = await fetch(`/api/bot-${action}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            dashboard.showNotification(data.message || `Bot ${action} successful!`, 'success');
            
            // Update status immediately
            setTimeout(() => {
                dashboard.updateStats();
            }, 2000);
            
        } else {
            throw new Error(data.message || `Failed to ${action} bot`);
        }
        
    } catch (error) {
        console.error(`Bot ${action} error:`, error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

// Cookie management functions
async function saveCookie() {
    const cookieInput = document.getElementById('cookieInput');
    const cookieData = cookieInput.value.trim();
    
    if (!cookieData) {
        dashboard.showNotification('Please enter cookie data', 'warning');
        return;
    }
    
    dashboard.showLoading('Saving cookie...');
    
    try {
        const response = await fetch('/api/save-cookie', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cookie: cookieData })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            dashboard.showNotification('Cookie saved successfully!', 'success');
            cookieInput.value = '';
            
            // Update cookie status
            setTimeout(() => {
                dashboard.updateCookieStatus();
            }, 1000);
            
        } else {
            throw new Error(data.message || 'Failed to save cookie');
        }
        
    } catch (error) {
        console.error('Save cookie error:', error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

async function loadCurrentCookie() {
    dashboard.showLoading('Loading current cookie...');
    
    try {
        const response = await fetch('/api/get-cookie');
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('cookieInput').value = data.cookie || '';
            dashboard.showNotification('Current cookie loaded', 'info');
        } else {
            throw new Error(data.message || 'Failed to load cookie');
        }
        
    } catch (error) {
        console.error('Load cookie error:', error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

async function validateCookie() {
    const cookieInput = document.getElementById('cookieInput');
    const cookieData = cookieInput.value.trim();
    
    if (!cookieData) {
        dashboard.showNotification('Please enter cookie data to validate', 'warning');
        return;
    }
    
    dashboard.showLoading('Validating cookie...');
    
    try {
        const response = await fetch('/api/validate-cookie', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ cookie: cookieData })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const isValid = data.isValid;
            dashboard.showNotification(
                isValid ? 'Cookie is valid!' : 'Cookie is invalid or expired',
                isValid ? 'success' : 'error'
            );
        } else {
            throw new Error(data.message || 'Failed to validate cookie');
        }
        
    } catch (error) {
        console.error('Validate cookie error:', error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

// Quick action functions
async function viewLogs() {
    showModal('Bot Logs', 'Loading logs...', '');
    
    try {
        const response = await fetch('/api/logs');
        const data = await response.text();
        
        document.getElementById('modalBody').innerHTML = `
            <pre style="
                background: rgba(0,0,0,0.3); 
                padding: 1rem; 
                border-radius: 10px; 
                max-height: 400px; 
                overflow-y: auto;
                font-family: monospace;
                font-size: 0.8rem;
                white-space: pre-wrap;
            ">${data}</pre>
        `;
        
    } catch (error) {
        document.getElementById('modalBody').innerHTML = `
            <p style="color: var(--danger-red);">Failed to load logs: ${error.message}</p>
        `;
    }
}

async function backupData() {
    dashboard.showLoading('Creating backup...');
    
    try {
        const response = await fetch('/api/backup-data');
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shizuka-bot-backup-${new Date().toISOString().split('T')[0]}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            dashboard.showNotification('Backup downloaded successfully!', 'success');
        } else {
            throw new Error('Failed to create backup');
        }
        
    } catch (error) {
        console.error('Backup error:', error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

async function clearCache() {
    if (!confirm('Are you sure you want to clear the cache? This may affect bot performance temporarily.')) {
        return;
    }
    
    dashboard.showLoading('Clearing cache...');
    
    try {
        const response = await fetch('/api/clear-cache', { method: 'POST' });
        const data = await response.json();
        
        if (response.ok) {
            dashboard.showNotification('Cache cleared successfully!', 'success');
        } else {
            throw new Error(data.message || 'Failed to clear cache');
        }
        
    } catch (error) {
        console.error('Clear cache error:', error);
        dashboard.showNotification(error.message, 'error');
    } finally {
        dashboard.hideLoading();
    }
}

function refreshStats() {
    dashboard.showNotification('Refreshing statistics...', 'info');
    dashboard.loadDashboardData();
}

// Modal functions
function showModal(title, body, footer = '') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    
    const footerElement = document.getElementById('modalFooter');
    if (footer) {
        footerElement.innerHTML = footer;
    } else {
        footerElement.innerHTML = '<button class="btn btn-secondary" onclick="closeModal()">Close</button>';
    }
    
    document.getElementById('actionModal').classList.add('show');
}

function closeModal() {
    document.getElementById('actionModal').classList.remove('show');
}

function showHelp() {
    showModal('Help & Support', `
        <div style="line-height: 1.6;">
            <h4 style="color: var(--shizuka-pink-400); margin-bottom: 1rem;">🚀 Getting Started</h4>
            <p><strong>Cookie Management:</strong> Paste your Facebook account cookie in the Cookie Management panel to keep your bot authenticated.</p>
            <p><strong>Bot Control:</strong> Use the Start, Stop, and Restart buttons to control your bot's operation.</p>
            
            <h4 style="color: var(--shizuka-pink-400); margin: 2rem 0 1rem;">🔧 Features</h4>
            <ul style="margin-left: 1rem;">
                <li><strong>Real-time Monitoring:</strong> Dashboard updates automatically every 30 seconds</li>
                <li><strong>Cookie Validation:</strong> Check if your cookie is still valid</li>
                <li><strong>System Info:</strong> Monitor server performance and resource usage</li>
                <li><strong>Quick Actions:</strong> Access logs, create backups, and manage cache</li>
            </ul>
            
            <h4 style="color: var(--shizuka-pink-400); margin: 2rem 0 1rem;">⚠️ Important Notes</h4>
            <p style="color: var(--electric-yellow);">• Always backup your data before making major changes</p>
            <p style="color: var(--electric-yellow);">• Keep your cookie updated to prevent bot disconnection</p>
            <p style="color: var(--electric-yellow);">• Monitor system resources to ensure stable operation</p>
        </div>
    `);
}

function showSettings() {
    showModal('Settings', `
        <div style="line-height: 1.6;">
            <h4 style="color: var(--shizuka-pink-400); margin-bottom: 1rem;">🎛️ Dashboard Settings</h4>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">Auto-refresh Interval:</label>
                <select id="refreshInterval" class="form-control" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; padding: 0.5rem;">
                    <option value="30">30 seconds</option>
                    <option value="60">1 minute</option>
                    <option value="300">5 minutes</option>
                    <option value="0">Disabled</option>
                </select>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">
                    <input type="checkbox" id="particlesEnabled" checked style="margin-right: 0.5rem;">
                    Enable Particle Effects
                </label>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <label style="display: block; margin-bottom: 0.5rem;">
                    <input type="checkbox" id="heartsEnabled" checked style="margin-right: 0.5rem;">
                    Enable Floating Hearts
                </label>
            </div>
        </div>
    `, `
        <button class="btn btn-primary" onclick="saveSettings()">Save Settings</button>
        <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
    `);
}

function saveSettings() {
    const refreshInterval = document.getElementById('refreshInterval').value;
    const particlesEnabled = document.getElementById('particlesEnabled').checked;
    const heartsEnabled = document.getElementById('heartsEnabled').checked;
    
    // Save to localStorage
    localStorage.setItem('dashboard-settings', JSON.stringify({
        refreshInterval: parseInt(refreshInterval),
        particlesEnabled,
        heartsEnabled
    }));
    
    // Apply settings
    applySettings();
    
    dashboard.showNotification('Settings saved successfully!', 'success');
    closeModal();
}

function applySettings() {
    const settings = JSON.parse(localStorage.getItem('dashboard-settings') || '{}');
    
    // Apply refresh interval
    if (settings.refreshInterval !== undefined) {
        if (settings.refreshInterval === 0) {
            dashboard.stopAutoRefresh();
        } else {
            dashboard.stopAutoRefresh();
            dashboard.refreshInterval = setInterval(() => {
                if (!dashboard.isLoading) {
                    dashboard.loadDashboardData();
                }
            }, settings.refreshInterval * 1000);
        }
    }
    
    // Apply visual effects
    const heartsContainer = document.querySelector('.hearts-container');
    if (heartsContainer) {
        heartsContainer.style.display = settings.heartsEnabled === false ? 'none' : 'block';
    }
    
    if (settings.particlesEnabled === false) {
        clearInterval(dashboard.particleInterval);
        document.getElementById('particles-bg').innerHTML = '';
    } else if (settings.particlesEnabled !== false) {
        dashboard.createParticles();
    }
}

// Global initialization functions (called from HTML)
function initializeDashboard() {
    // Load and apply saved settings
    applySettings();
    
    // Initialize dashboard
    if (!dashboard.initialized) {
        dashboard.initializeEventListeners();
    }
}

function startAutoRefresh() {
    dashboard.startAutoRefresh();
}

function createParticles() {
    dashboard.createParticles();
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        dashboard.stopAutoRefresh();
        clearInterval(dashboard.particleInterval);
    } else {
        dashboard.startAutoRefresh();
        dashboard.createParticles();
        dashboard.loadDashboardData(); // Refresh data when page becomes visible
    }
});

// Handle window resize for particles
window.addEventListener('resize', function() {
    // Recreate particles with new window dimensions
    clearTimeout(window.resizeTimeout);
    window.resizeTimeout = setTimeout(() => {
        dashboard.createParticles();
    }, 250);
});

// Add CSS for modal and notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes notificationSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .status-badge.valid {
        color: var(--neon-green);
        border-color: var(--neon-green);
    }
    
    .status-badge.invalid {
        color: var(--danger-red);
        border-color: var(--danger-red);
    }
`;
document.head.appendChild(style);