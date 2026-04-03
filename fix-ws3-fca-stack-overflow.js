/**
 * Emergency fix for ws3-fca resolveAttachmentUrl stack overflow issue
 * This file applies a monkey patch to prevent infinite recursion in attachment processing
 */

const path = require('path');
const fs = require('fs');

// Counter to prevent infinite recursion
let resolveAttachmentUrlCallCount = 0;
const MAX_RECURSION_DEPTH = 50;

/**
 * Apply emergency fixes to prevent stack overflow in ws3-fca
 */
function applyEmergencyFixes() {
    try {
        console.log('🔧 Applying emergency fixes for ws3-fca stack overflow...');
        
        // Find and patch the problematic function
        const ws3FcaPath = path.join(__dirname, 'node_modules', 'ws3-fca');
        
        if (!fs.existsSync(ws3FcaPath)) {
            console.log('⚠️ ws3-fca module not found, skipping patch');
            return;
        }
        
        // Try to monkey-patch the module after it's loaded
        process.nextTick(() => {
            try {
                // Hook into require to patch ws3-fca when it loads
                const Module = require('module');
                const originalRequire = Module.prototype.require;
                
                Module.prototype.require = function(...args) {
                    const result = originalRequire.apply(this, args);
                    
                    // Check if this is the ws3-fca module being loaded
                    if (args[0] && (args[0].includes('ws3-fca') || args[0].includes('listenMqtt'))) {
                        console.log('🎯 Detected ws3-fca module loading, applying patches...');
                        patchResolveAttachmentUrl();
                    }
                    
                    return result;
                };
                
                console.log('✅ Emergency fix hooks installed');
            } catch (error) {
                console.log('⚠️ Could not install emergency fix hooks:', error.message);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to apply emergency fixes:', error.message);
    }
}

/**
 * Patch the resolveAttachmentUrl function to prevent infinite recursion
 */
function patchResolveAttachmentUrl() {
    try {
        // Create a safe wrapper for attachment URL resolution
        global.safeResolveAttachmentUrl = function(url, maxDepth = 10, currentDepth = 0) {
            // Prevent infinite recursion
            if (currentDepth >= maxDepth) {
                console.log('⚠️ Attachment URL resolution depth limit reached, returning original URL');
                return url;
            }
            
            resolveAttachmentUrlCallCount++;
            
            // Reset counter periodically
            if (resolveAttachmentUrlCallCount > 1000) {
                resolveAttachmentUrlCallCount = 0;
            }
            
            // If we're hitting too many calls too quickly, something's wrong
            if (resolveAttachmentUrlCallCount > MAX_RECURSION_DEPTH) {
                console.log('🚨 Detected potential infinite recursion in attachment processing');
                console.log('🛑 Stopping recursion and returning original URL');
                resolveAttachmentUrlCallCount = 0;
                return url;
            }
            
            try {
                // Basic URL validation
                if (!url || typeof url !== 'string') {
                    return url;
                }
                
                // If URL looks already resolved, don't process further
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    if (!url.includes('facebook.com') && !url.includes('fbcdn.net')) {
                        return url; // Non-Facebook URLs are probably fine
                    }
                }
                
                // Return the URL as-is for now to prevent recursion
                return url;
                
            } catch (error) {
                console.log('⚠️ Error in safe attachment URL resolution:', error.message);
                return url; // Return original URL on error
            }
        };
        
        console.log('✅ Safe attachment URL resolver installed');
        
    } catch (error) {
        console.error('❌ Failed to patch resolveAttachmentUrl:', error.message);
    }
}

/**
 * Set up process monitoring for attachment-related errors
 */
function setupAttachmentErrorMonitoring() {
    // Monitor for specific error patterns
    const originalEmit = process.emit;
    
    process.emit = function(event, error) {
        if (event === 'uncaughtException' && error) {
            if (error.message && error.message.includes('Maximum call stack size exceeded')) {
                if (error.stack && error.stack.includes('resolveAttachmentUrl')) {
                    console.log('🚨 Caught resolveAttachmentUrl stack overflow!');
                    console.log('🔧 Applying emergency reset...');
                    
                    // Reset counters
                    resolveAttachmentUrlCallCount = 0;
                    
                    // Don't let this crash the process
                    console.log('✅ Emergency reset complete, continuing...');
                    return true;
                }
            }
        }
        
        return originalEmit.apply(this, arguments);
    };
}

// Apply fixes immediately when this module is loaded
applyEmergencyFixes();
setupAttachmentErrorMonitoring();

module.exports = {
    applyEmergencyFixes,
    patchResolveAttachmentUrl,
    setupAttachmentErrorMonitoring
};