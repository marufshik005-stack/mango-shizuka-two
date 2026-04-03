#!/usr/bin/env node

/**
 * Optimized startup script for Render deployment
 * Handles memory constraints and environment setup
 */

// Set NODE_ENV to production for Render
process.env.NODE_ENV = 'production';

// Enable garbage collection for better memory management
if (process.argv.includes('--expose-gc')) {
    // GC is already enabled via --expose-gc flag
} else {
    console.log('⚠️ [RENDER] Garbage collection not enabled. For better memory management, use --expose-gc flag');
}

// Memory limits for Render free tier (512MB)
const RENDER_MEMORY_LIMIT_MB = 512;
const WARNING_THRESHOLD_MB = 400;

console.log('🚀 [RENDER] Starting Shizuka Bot with optimizations...');
console.log(`📊 [RENDER] Memory limit: ${RENDER_MEMORY_LIMIT_MB}MB`);

// Override console methods to reduce memory usage from logging
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Limit log history to prevent memory buildup
let logCount = 0;
const MAX_LOGS = 100;

console.log = function(...args) {
    if (logCount < MAX_LOGS) {
        originalLog.apply(console, args);
        logCount++;
    }
    // Reset counter periodically
    if (logCount >= MAX_LOGS) {
        logCount = 0;
    }
};

console.error = function(...args) {
    originalError.apply(console, args);
};

console.warn = function(...args) {
    originalWarn.apply(console, args);
};

// Monitor memory usage and exit gracefully before hitting limits
function monitorMemoryForRender() {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const rssMB = memUsage.rss / 1024 / 1024;
        
        // Log memory usage every 2 minutes
        if (Date.now() % (2 * 60 * 1000) < 30000) {
            console.log(`📊 [RENDER] Memory: ${heapUsedMB.toFixed(1)}MB heap, ${rssMB.toFixed(1)}MB RSS`);
        }
        
        // Warn when approaching limits
        if (heapUsedMB > WARNING_THRESHOLD_MB) {
            console.warn(`⚠️ [RENDER] Memory warning: ${heapUsedMB.toFixed(1)}MB / ${RENDER_MEMORY_LIMIT_MB}MB`);
            
            // Force garbage collection if available
            if (global.gc) {
                try {
                    global.gc();
                    console.log('🧹 [RENDER] Forced garbage collection');
                } catch (error) {
                    console.error('❌ [RENDER] GC error:', error.message);
                }
            }
        }
        
        // Emergency exit before hitting the limit
        if (heapUsedMB > (RENDER_MEMORY_LIMIT_MB - 32)) { // Leave 32MB buffer
            console.error(`🚨 [RENDER] Memory critical: ${heapUsedMB.toFixed(1)}MB`);
            console.error('🔄 [RENDER] Restarting to prevent OOM...');
            
            // Graceful shutdown
            process.exit(2); // Exit code 2 triggers restart
        }
        
    }, 30000); // Check every 30 seconds
}

// Start memory monitoring
monitorMemoryForRender();

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
    console.error('💥 [RENDER] Uncaught Exception:', error.message);
    
    // If it's a memory error, exit immediately
    if (error.message.includes('out of memory') || 
        error.message.includes('heap out of memory') ||
        error.code === 'ENOMEM') {
        console.error('🚨 [RENDER] Out of memory error detected');
        process.exit(3);
    }
    
    // For other errors, try to continue
    console.error('📊 [RENDER] Attempting to continue...');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 [RENDER] Unhandled Rejection at:', promise, 'reason:', reason);
    
    // If it's a memory-related rejection, exit
    if (reason && reason.message && (
        reason.message.includes('out of memory') ||
        reason.message.includes('heap out of memory'))) {
        console.error('🚨 [RENDER] Memory-related rejection detected');
        process.exit(3);
    }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('📴 [RENDER] SIGTERM received, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 [RENDER] SIGINT received, shutting down gracefully...');
    process.exit(0);
});

// Set some environment optimizations for Render
process.env.UV_THREADPOOL_SIZE = '4'; // Reduce thread pool size
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --max-old-space-size=480'; // 480MB heap limit

// Load the main bot application
console.log('🎯 [RENDER] Loading main application...');

try {
    require('./Goat.js');
    console.log('✅ [RENDER] Main application loaded successfully');
} catch (error) {
    console.error('❌ [RENDER] Failed to load main application:', error.message);
    console.error('📊 [RENDER] Stack trace:', error.stack);
    process.exit(1);
}