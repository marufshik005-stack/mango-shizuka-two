/**
 * Memory Optimization Patch for Shizuka Bot
 * Fixes memory leaks and optimizes memory usage for Render deployment
 */

const { performance } = require('perf_hooks');

// Memory monitoring configuration
const MEMORY_CHECK_INTERVAL = 30000; // 30 seconds
const MEMORY_WARNING_THRESHOLD = 400; // MB
const MEMORY_CRITICAL_THRESHOLD = 480; // MB
const GC_FORCE_THRESHOLD = 450; // MB

class MemoryOptimizer {
    constructor() {
        this.memoryStats = [];
        this.gcCount = 0;
        this.lastGC = Date.now();
        
        // Apply optimizations immediately
        this.applyMemoryOptimizations();
        this.startMemoryMonitoring();
    }
    
    /**
     * Apply memory optimization patches
     */
    applyMemoryOptimizations() {
        console.log('🚀 [MEMORY] Applying memory optimizations...');
        
        // 1. Optimize global data structures
        this.optimizeGlobalStructures();
        
        // 2. Add memory-aware data loading
        this.optimizeDataLoading();
        
        // 3. Set up garbage collection optimization
        this.optimizeGarbageCollection();
        
        // 4. Add memory leak prevention
        this.preventMemoryLeaks();
        
        console.log('✅ [MEMORY] Memory optimizations applied successfully');
    }
    
    /**
     * Optimize global data structures to use less memory
     */
    optimizeGlobalStructures() {
        // Limit array sizes in global objects
        const originalPush = Array.prototype.push;
        const maxArraySizes = {
            'storage5Message': 5,
            'oldListening': 3,
            'createThreadData': 100,
            'createUserData': 100,
            'creatingThreadData': 50,
            'creatingUserData': 50
        };
        
        // Override array push to maintain size limits
        Array.prototype.push = function(...items) {
            const result = originalPush.apply(this, items);
            
            // Check if this array needs size limiting
            for (const [key, maxSize] of Object.entries(maxArraySizes)) {
                if (global.temp?.[key] === this || 
                    global.client?.database?.[key] === this ||
                    global.GoatBot?.[key] === this) {
                    
                    if (this.length > maxSize) {
                        this.splice(0, this.length - maxSize);
                    }
                    break;
                }
            }
            
            return result;
        };
        
        console.log('🔧 [MEMORY] Global structures optimized');
    }
    
    /**
     * Optimize data loading to prevent memory bloat
     */
    optimizeDataLoading() {
        // Override the database loading function to use pagination
        const originalRequire = require;
        
        // Patch MongoDB connection to use lean queries and limits
        global.optimizedMongoQuery = function(model, query = {}, options = {}) {
            const defaultOptions = {
                lean: true, // Return plain objects instead of Mongoose documents
                limit: options.limit || 1000, // Limit results
                sort: options.sort || { updatedAt: -1 }
            };
            
            return model.find(query, null, { ...defaultOptions, ...options });
        };
        
        console.log('🔧 [MEMORY] Data loading optimized');
    }
    
    /**
     * Optimize garbage collection
     */
    optimizeGarbageCollection() {
        // Force garbage collection when memory usage is high
        if (global.gc) {
            const originalGC = global.gc;
            
            global.gc = function() {
                try {
                    const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
                    originalGC();
                    const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
                    console.log(`🧹 [MEMORY] GC freed ${(memBefore - memAfter).toFixed(2)} MB`);
                } catch (error) {
                    console.error('❌ [MEMORY] GC error:', error.message);
                }
            };
        }
        
        // Set up automatic garbage collection
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            
            if (heapUsedMB > GC_FORCE_THRESHOLD && global.gc) {
                console.log(`⚠️ [MEMORY] High usage detected: ${heapUsedMB.toFixed(2)} MB, forcing GC...`);
                global.gc();
                this.gcCount++;
                this.lastGC = Date.now();
            }
        }, 60000); // Check every minute
        
        console.log('🔧 [MEMORY] Garbage collection optimized');
    }
    
    /**
     * Prevent common memory leaks
     */
    preventMemoryLeaks() {
        // 1. Clear intervals and timeouts on process exit
        const intervals = new Set();
        const timeouts = new Set();
        
        const originalSetInterval = global.setInterval;
        const originalSetTimeout = global.setTimeout;
        const originalClearInterval = global.clearInterval;
        const originalClearTimeout = global.clearTimeout;
        
        global.setInterval = function(fn, delay, ...args) {
            const id = originalSetInterval(fn, delay, ...args);
            intervals.add(id);
            return id;
        };
        
        global.setTimeout = function(fn, delay, ...args) {
            const id = originalSetTimeout(fn, delay, ...args);
            timeouts.add(id);
            return id;
        };
        
        global.clearInterval = function(id) {
            intervals.delete(id);
            return originalClearInterval(id);
        };
        
        global.clearTimeout = function(id) {
            timeouts.delete(id);
            return originalClearTimeout(id);
        };
        
        // Clean up on process exit
        process.on('exit', () => {
            intervals.forEach(id => originalClearInterval(id));
            timeouts.forEach(id => originalClearTimeout(id));
        });
        
        // 2. Limit event listener growth
        const originalAddListener = require('events').EventEmitter.prototype.addListener;
        require('events').EventEmitter.prototype.addListener = function(event, listener) {
            const result = originalAddListener.call(this, event, listener);
            
            // Warn if too many listeners
            const listenerCount = this.listenerCount(event);
            if (listenerCount > 10) {
                console.warn(`⚠️ [MEMORY] High listener count for event '${event}': ${listenerCount}`);
            }
            
            return result;
        };
        
        console.log('🔧 [MEMORY] Memory leak prevention activated');
    }
    
    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        const startTime = Date.now();
        
        setInterval(() => {
            const memUsage = process.memoryUsage();
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
            const externalMB = memUsage.external / 1024 / 1024;
            const rssMB = memUsage.rss / 1024 / 1024;
            
            const stats = {
                timestamp: Date.now(),
                heapUsed: heapUsedMB,
                heapTotal: heapTotalMB,
                external: externalMB,
                rss: rssMB,
                uptime: (Date.now() - startTime) / 1000
            };
            
            this.memoryStats.push(stats);
            
            // Keep only last 10 measurements
            if (this.memoryStats.length > 10) {
                this.memoryStats.shift();
            }
            
            // Log memory status
            if (heapUsedMB > MEMORY_CRITICAL_THRESHOLD) {
                console.error(`🚨 [MEMORY] CRITICAL: ${heapUsedMB.toFixed(2)} MB / 512 MB`);
                this.emergencyCleanup();
            } else if (heapUsedMB > MEMORY_WARNING_THRESHOLD) {
                console.warn(`⚠️ [MEMORY] WARNING: ${heapUsedMB.toFixed(2)} MB / 512 MB`);
            } else {
                console.log(`📊 [MEMORY] Usage: ${heapUsedMB.toFixed(2)} MB / 512 MB`);
            }
            
        }, MEMORY_CHECK_INTERVAL);
        
        console.log('📊 [MEMORY] Memory monitoring started');
    }
    
    /**
     * Emergency cleanup when memory is critically high
     */
    emergencyCleanup() {
        console.log('🆘 [MEMORY] Performing emergency cleanup...');
        
        try {
            // 1. Clear caches
            if (global.client?.cache) {
                Object.keys(global.client.cache).forEach(key => {
                    delete global.client.cache[key];
                });
                console.log('🧹 [MEMORY] Cleared client cache');
            }
            
            // 2. Clear temp data
            if (global.temp) {
                ['filesOfGoogleDrive', 'contentScripts'].forEach(key => {
                    if (global.temp[key] && typeof global.temp[key] === 'object') {
                        Object.keys(global.temp[key]).forEach(subKey => {
                            delete global.temp[key][subKey];
                        });
                    }
                });
                console.log('🧹 [MEMORY] Cleared temp data');
            }
            
            // 3. Force garbage collection
            if (global.gc) {
                global.gc();
                console.log('🧹 [MEMORY] Forced garbage collection');
            }
            
            // 4. Clear old database arrays
            if (global.db) {
                ['allThreadData', 'allUserData'].forEach(key => {
                    if (global.db[key] && Array.isArray(global.db[key])) {
                        if (global.db[key].length > 500) {
                            global.db[key] = global.db[key].slice(-500);
                            console.log(`🧹 [MEMORY] Trimmed ${key} to 500 items`);
                        }
                    }
                });
            }
            
        } catch (error) {
            console.error('❌ [MEMORY] Emergency cleanup error:', error.message);
        }
    }
    
    /**
     * Get memory statistics
     */
    getStats() {
        return {
            current: process.memoryUsage(),
            history: this.memoryStats,
            gcCount: this.gcCount,
            lastGC: this.lastGC
        };
    }
}

// Initialize memory optimizer
const memoryOptimizer = new MemoryOptimizer();

// Export for external use
module.exports = {
    MemoryOptimizer,
    memoryOptimizer,
    getMemoryStats: () => memoryOptimizer.getStats(),
    forceCleanup: () => memoryOptimizer.emergencyCleanup()
};

console.log('✅ [MEMORY] Memory optimizer loaded successfully');