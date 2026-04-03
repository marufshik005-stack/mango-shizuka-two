/**
 * Shizuka Bot Cookie Persistence Fix
 * 
 * This patch prevents the bot from clearing cookies when they are saved
 * through the web dashboard by intercepting the file watcher logic.
 * 
 * Issue: When cookies are saved via dashboard, the file watcher detects
 * the change and triggers a bot restart, causing cookies to be cleared.
 * 
 * Solution: Add a flag system to prevent restart when cookies are saved
 * from the dashboard.
 */

// Override the file watcher behavior to prevent unnecessary restarts
const fs = require('fs');
const originalWatch = fs.watch;

// Flag to track if cookies were saved from dashboard
global.cookieSavedFromDashboard = false;

// Override fs.watch to add smart filtering
fs.watch = function(filename, options, listener) {
    if (typeof options === 'function') {
        listener = options;
        options = {};
    }
    
    // If watching account.txt, add our filtering logic
    if (filename && filename.includes('account.txt')) {
        const wrappedListener = function(eventType, filename) {
            // If cookies were saved from dashboard, ignore the file change event
            if (global.cookieSavedFromDashboard) {
                console.log('🍪 File change ignored - cookies saved from dashboard');
                return;
            }
            
            // Otherwise, proceed with normal file watching
            if (listener) {
                listener(eventType, filename);
            }
        };
        
        return originalWatch.call(this, filename, options, wrappedListener);
    }
    
    // For other files, use normal watching
    return originalWatch.call(this, filename, options, listener);
};

console.log('✅ Cookie persistence patch loaded successfully!');
console.log('🔧 File watcher enhanced to prevent dashboard-triggered restarts');

module.exports = {
    setCookieSavedFlag: (value = true, duration = 15000) => {
        global.cookieSavedFromDashboard = value;
        if (value && duration > 0) {
            setTimeout(() => {
                global.cookieSavedFromDashboard = false;
            }, duration);
        }
    }
};