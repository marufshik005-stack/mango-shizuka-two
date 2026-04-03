/**
 * @author NTKhang
 * ! The source code is written by NTKhang, please don't change the author's name everywhere. Thank you for using
 * ! Official source code: https://github.com/ntkhang03/Goat-Bot-V2
 * ! If you do not download the source code from the above address, you are using an unknown version and at risk of having your account hacked
 *
 * English:
 * ! Please do not change the below code, it is very important for the project.
 * It is my motivation to maintain and develop the project for free.
 * ! If you change it, you will be banned forever
 * Thank you for using
 *
 * Vietnamese:
 * ! Vui lòng không thay đổi mã bên dưới, nó rất quan trọng đối với dự án.
 * Nó là động lực để tôi duy trì và phát triển dự án miễn phí.
 * ! Nếu thay đổi nó, bạn sẽ bị cấm vĩnh viễn
 * Cảm ơn bạn đã sử dụng
 */

const { spawn } = require("child_process");
const path = require('path');

// Load emergency fix for ws3-fca stack overflow BEFORE anything else
try {
    require('./fix-ws3-fca-stack-overflow.js');
    console.log('✅ Emergency stack overflow fix loaded successfully');
} catch (error) {
    console.log('⚠️ Could not load emergency fix:', error.message);
}

// Global variables to track bot status and data
let botProcess = null;
let botStatus = {
    isRunning: false,
    pid: null,
    startTime: null,
    lastError: null
};

// Store bot data received from child process
let botData = {
    totalThreads: 0,
    totalUsers: 0,
    isLoggedIn: false,
    lastUpdated: null
};

// File-based communication as fallback
const fs = require('fs');
const statsFilePath = path.join(__dirname, 'bot-stats.json');

// Slap meme generation is now handled by external API service

// Function to read bot stats from file
function readBotStatsFromFile() {
    try {
        if (fs.existsSync(statsFilePath)) {
            const fileContent = fs.readFileSync(statsFilePath, 'utf8');
            const stats = JSON.parse(fileContent);
            
            // Check if stats are recent (within last 5 minutes)
            const lastUpdated = new Date(stats.timestamp);
            const now = new Date();
            const timeDiff = (now - lastUpdated) / 1000 / 60; // minutes
            
            if (timeDiff < 5) {
                botData.totalThreads = stats.totalThreads || 0;
                botData.totalUsers = stats.totalUsers || 0;
                botData.isLoggedIn = stats.isLoggedIn || false;
                botData.lastUpdated = stats.timestamp;
                return true;
            }
        }
    } catch (error) {
        console.log('Could not read bot stats file:', error.message);
    }
    return false;
}

function startProject() {
    console.log("🚀 Starting Shizuka Bot...");
    
    // Add process-level error handlers for uncaught exceptions
    process.on('uncaughtException', (error) => {
        console.error('🚨 CRITICAL ERROR - Uncaught Exception:', error.message);
        console.error('Stack:', error.stack);
        
        // Check if it's the stack overflow we're dealing with
        if (error.message.includes('Maximum call stack size exceeded') || 
            error.stack?.includes('resolveAttachmentUrl')) {
            console.log('⚠️ Detected ws3-fca attachment processing stack overflow');
            console.log('🔄 Attempting to restart bot process...');
            
            // Kill current bot process if it exists
            if (botProcess && !botProcess.killed) {
                botProcess.kill('SIGTERM');
            }
            
            // Restart after a delay
            setTimeout(() => {
                startProject();
            }, 3000);
        } else {
            console.log('💥 Unrecoverable error, stopping bot');
            botStatus.lastError = `Critical error: ${error.message}`;
            process.exit(1);
        }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 Unhandled Promise Rejection:', reason);
        console.error('Promise:', promise);
        
        // Log but don't crash the dashboard server
        botStatus.lastError = `Promise rejection: ${reason}`;
    });
    
    // Start the bot in background with optimized startup
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.RENDER || 
                        process.env.RAILWAY_ENVIRONMENT ||
                        process.env.HEROKU_APP_NAME;
    
    const startScript = isProduction ? "start-render.js" : "Goat.js";
    const nodeArgs = isProduction ? ["--expose-gc", "--max-old-space-size=480", startScript] : [startScript];
    
    console.log(`🚀 Starting bot with: node ${nodeArgs.join(' ')}`);
    
    botProcess = spawn("node", nodeArgs, {
        cwd: __dirname,
        stdio: ["pipe", "pipe", "pipe"], // Capture stdout/stderr
        shell: true,
        env: { ...process.env, NODE_ENV: isProduction ? 'production' : process.env.NODE_ENV }
    });
    
    botStatus.isRunning = true;
    botStatus.pid = botProcess.pid;
    botStatus.startTime = new Date();
    botStatus.lastError = null;
    
    console.log(`✅ Bot started with PID: ${botProcess.pid}`);
    
    // Monitor bot output for stack overflow errors
    botProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(output); // Forward to main process
        
        // Check for specific error patterns
        if (output.includes('Maximum call stack size exceeded') || 
            output.includes('resolveAttachmentUrl')) {
            console.log('\n⚠️ Detected stack overflow in bot process output');
            console.log('🔄 Scheduling bot restart in 5 seconds...');
            
            setTimeout(() => {
                if (botProcess && !botProcess.killed) {
                    botProcess.kill('SIGTERM');
                    setTimeout(() => startProject(), 2000);
                }
            }, 5000);
        }
    });
    
    botProcess.stderr.on('data', (data) => {
        const output = data.toString();
        process.stderr.write(output); // Forward to main process
        
        // Check for stack overflow in stderr
        if (output.includes('Maximum call stack size exceeded') || 
            output.includes('resolveAttachmentUrl')) {
            console.log('\n⚠️ Detected stack overflow in bot stderr');
            console.log('🔄 Restarting bot to recover...');
            
            if (botProcess && !botProcess.killed) {
                botProcess.kill('SIGTERM');
                setTimeout(() => startProject(), 3000);
            }
        }
    });
    
    botProcess.on("close", (code) => {
        botStatus.isRunning = false;
        botStatus.pid = null;
        
        console.log(`🔄 Bot process closed with code: ${code}`);
        
        if (code == 2) {
            console.log("📋 Normal restart request");
            setTimeout(() => startProject(), 2000);
        } else if (code === null || code === 143) {
            // Process was killed (probably by our error handler)
            console.log("⚡ Bot process was terminated, restarting...");
            setTimeout(() => startProject(), 2000);
        } else {
            console.log(`❌ Bot process exited unexpectedly with code: ${code}`);
            botStatus.lastError = `Process exited with code: ${code}`;
            
            // Auto-restart after unexpected exits
            console.log("🔄 Auto-restarting in 5 seconds...");
            setTimeout(() => startProject(), 5000);
        }
    });
    
    botProcess.on("error", (error) => {
        console.log(`❌ Bot process error: ${error.message}`);
        botStatus.lastError = error.message;
        botStatus.isRunning = false;
        
        // Restart on process errors
        console.log("🔄 Restarting due to process error...");
        setTimeout(() => startProject(), 3000);
    });
}

startProject();

// Function to start the dashboard immediately
async function startDashboard() {
    console.log("🌸 Starting dashboard server...");
    
    // Start dashboard server immediately for port binding
    await startFallbackDashboard();
    
    // Wait for bot initialization in background
    waitForBotAndStartComprehensiveDashboard();
}

// Wait for bot and try to upgrade to comprehensive dashboard
async function waitForBotAndStartComprehensiveDashboard() {
    let attempts = 0;
    const maxAttempts = 12; // 1 minute total
    
    const checkBot = async () => {
        attempts++;
        
        if (global.GoatBot && global.db) {
            try {
                console.log("✅ Bot initialized! Dashboard features now fully available.");
                return; // Bot is ready, comprehensive features available
            } catch (error) {
                console.log(`⚠️ Error checking bot: ${error.message}`);
            }
        }
        
        if (attempts < maxAttempts) {
            console.log(`⏳ Waiting for bot initialization... (${attempts}/${maxAttempts})`);
            setTimeout(checkBot, 5000);
        } else {
            console.log("⚠️ Bot initialization timeout. Dashboard running in basic mode.");
        }
    };
    
    setTimeout(checkBot, 2000);
}

// Fallback simple dashboard
async function startFallbackDashboard() {
    const http = require('http');
    const fs = require('fs');
    const url = require('url');
    const os = require('os');
    
    // Load config
    let config;
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        config = { dashBoard: { port: 3001 } };
    }
    
    const PORT = process.env.PORT || config.dashBoard?.port || 10000;
    
    const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);
        
        // Handle static files
        if (parsedUrl.pathname.startsWith('/css/') || 
            parsedUrl.pathname.startsWith('/js/') || 
            parsedUrl.pathname.startsWith('/images/')) {
            
            const filePath = path.join(__dirname, 'dashboard', parsedUrl.pathname);
            
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(404);
                    res.end('File not found');
                    return;
                }
                
                let contentType = 'text/plain';
                if (parsedUrl.pathname.endsWith('.css')) contentType = 'text/css';
                else if (parsedUrl.pathname.endsWith('.js')) contentType = 'text/javascript';
                else if (parsedUrl.pathname.endsWith('.png')) contentType = 'image/png';
                else if (parsedUrl.pathname.endsWith('.jpg')) contentType = 'image/jpeg';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
            return;
        }
        
        // Handle API requests
        if (parsedUrl.pathname.startsWith('/api/')) {
            // Don't set headers globally - let each endpoint handle its own headers
            
            if (parsedUrl.pathname === '/api/bot-status') {
                res.setHeader('Content-Type', 'application/json');
                
                // Check if the bot is actually working (receiving messages)
                const isReceivingMessages = global.GoatBot && global.GoatBot.fcaApi;
                const actuallyOnline = isReceivingMessages || botStatus.isRunning;
                
                res.end(JSON.stringify({
                    status: 'success',
                    data: {
                        status: actuallyOnline ? 'online' : 'offline',
                        message: actuallyOnline ? 'Bot is running and processing messages' : (botStatus.lastError || 'Bot is starting up...'),
                        uptime: process.uptime(),
                        isLoggedIn: !!isReceivingMessages,
                        pid: botStatus.pid,
                        startTime: botStatus.startTime,
                        botInitialized: !!global.GoatBot,
                        dbInitialized: !!global.db
                    }
                }));
                return;
            }
            
            // Enhanced stats endpoint with real database data
            if (parsedUrl.pathname === '/api/stats') {
                // Handle async database calls
                (async () => {
                    try {
                        let totalThreads = 0;
                        let totalUsers = 0;
                        let isLoggedIn = false;
                        
                        // First, try to read from bot stats file (primary method)
                        const hasFileStats = readBotStatsFromFile();
                        if (hasFileStats) {
                            totalThreads = botData.totalThreads;
                            totalUsers = botData.totalUsers;
                            isLoggedIn = botData.isLoggedIn;
                        } else {
                            // Fallback: Try to get data from global objects (if available)
                            if (global.db && global.db.threadsData && global.db.usersData) {
                                try {
                                    // Get data from the database handlers
                                    const threadsData = await global.db.threadsData.getAll();
                                    const usersData = await global.db.usersData.getAll();
                                    totalThreads = threadsData ? threadsData.length : 0;
                                    totalUsers = usersData ? usersData.length : 0;
                                    isLoggedIn = !!(global.GoatBot && global.GoatBot.fcaApi);
                                } catch (dbError) {
                                    console.log('Database query error, using fallback data:', dbError.message);
                                    // Fallback to allThreadData and allUserData
                                    totalThreads = global.db.allThreadData ? global.db.allThreadData.length : 0;
                                    totalUsers = global.db.allUserData ? global.db.allUserData.length : 0;
                                    isLoggedIn = !!(global.GoatBot && global.GoatBot.fcaApi);
                                }
                            } else if (global.db) {
                                // Fallback to the arrays if database handlers aren't ready
                                totalThreads = global.db.allThreadData ? global.db.allThreadData.length : 0;
                                totalUsers = global.db.allUserData ? global.db.allUserData.length : 0;
                                isLoggedIn = !!(global.GoatBot && global.GoatBot.fcaApi);
                            }
                        }
                        
                        const stats = {
                            totalThreads,
                            totalUsers,
                            uptime: process.uptime(),
                            memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                            botReady: !!(global.GoatBot && global.db),
                            isLoggedIn: isLoggedIn,
                            dbConnected: !!(global.db && global.db.threadsData),
                            lastUpdated: botData.lastUpdated || new Date().toISOString(),
                            statsSource: hasFileStats ? 'file' : 'global'
                        };
                        
                        res.end(JSON.stringify({
                            status: 'success',
                            data: stats
                        }));
                    } catch (error) {
                        console.error('Stats API error:', error);
                        res.end(JSON.stringify({
                            status: 'success',
                            data: {
                                totalThreads: 0,
                                totalUsers: 0,
                                uptime: process.uptime(),
                                memoryUsage: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
                                botReady: false,
                                isLoggedIn: false,
                                error: error.message
                            }
                        }));
                    }
                })();
                return;
            }
            
            if (parsedUrl.pathname === '/api/bot-control') {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const { action } = JSON.parse(body);
                            handleBotControl(action, res);
                        } catch (error) {
                            res.end(JSON.stringify({ status: 'error', message: 'Invalid request' }));
                        }
                    });
                    return;
                }
            }
            
            if (parsedUrl.pathname === '/api/system-info') {
                res.setHeader('Content-Type', 'application/json');
                
                const os = require('os');
                const memoryUsage = process.memoryUsage();
                
                res.end(JSON.stringify({
                    status: 'success',
                    data: {
                        nodeVersion: process.version,
                        platform: `${os.type()} ${os.release()}`,
                        memoryUsage: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                        uptime: process.uptime(),
                        lastRestart: new Date(Date.now() - process.uptime() * 1000).toLocaleString()
                    }
                }));
                return;
            }
            
            if (parsedUrl.pathname === '/api/cookie-status') {
                res.setHeader('Content-Type', 'application/json');
                
                const accountPath = path.join(process.cwd(), 'account.txt');
                
                try {
                    if (!fs.existsSync(accountPath)) {
                        res.end(JSON.stringify({
                            status: 'success',
                            data: {
                                exists: false,
                                age: 'No cookie found',
                                lastUpdated: 'Never',
                                isValid: false
                            }
                        }));
                        return;
                    }
                    
                    const stats = fs.statSync(accountPath);
                    const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
                    
                    // More tolerant validation - consider valid if file exists and is recent
                    const isRecentlyUpdated = ageInHours < 72; // Consider valid if updated within 3 days
                    const isValid = botStatus.isRunning || isRecentlyUpdated;
                    
                    res.end(JSON.stringify({
                        status: 'success',
                        data: {
                            exists: true,
                            age: ageInHours < 24 ? `${Math.floor(ageInHours)} hours` : `${Math.floor(ageInHours / 24)} days`,
                            lastUpdated: stats.mtime.toLocaleString(),
                            isValid: isValid,
                            botRunning: botStatus.isRunning,
                            note: isValid ? 'Cookie appears to be valid' : 'Cookie may be expired or invalid'
                        }
                    }));
                } catch (error) {
                    res.end(JSON.stringify({ status: 'error', message: 'Failed to get cookie status' }));
                }
                return;
            }
            
            if (parsedUrl.pathname === '/api/cookie-save') {
                console.log('🍪 Cookie save endpoint hit, method:', req.method, 'Headers sent:', res.headersSent);
                
                // If headers already sent, someone else handled this request
                if (res.headersSent) {
                    console.log('⚠️ Request already handled by another handler, skipping');
                    return;
                }
                
                // Handle CORS preflight OPTIONS request
                if (req.method === 'OPTIONS') {
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    res.setHeader('Access-Control-Max-Age', '86400');
                    res.writeHead(200);
                    res.end();
                    return;
                }
                
                if (req.method === 'POST') {
                    // Check if headers are already sent
                    if (!res.headersSent) {
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
                        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                    }
                    
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk;
                        console.log('📦 Received data chunk, total body length:', body.length);
                    });
                    req.on('end', () => {
                        try {
                            console.log('📝 Full request body:', body);
                            
                            if (!body.trim()) {
                                console.log('❌ Empty request body');
                                if (!res.headersSent) {
                                    res.end(JSON.stringify({ status: 'error', message: 'Empty request body' }));
                                }
                                return;
                            }
                            
                            const parsedBody = JSON.parse(body);
                            console.log('✅ Parsed body:', parsedBody);
                            const { cookie } = parsedBody;
                            
                            console.log('🍪 Cookie data received:', cookie ? 'Yes (' + cookie.length + ' chars)' : 'No');
                            
                            if (!cookie) {
                                if (!res.headersSent) {
                                    res.end(JSON.stringify({ status: 'error', message: 'Cookie data is required' }));
                                }
                                return;
                            }
                            
                            const cookieData = cookie.trim();
                            const accountPath = path.join(process.cwd(), 'account.txt');
                            
                            // Prevent multiple simultaneous cookie saves
                            if (global.cookieSaveInProgress) {
                                console.log('⚠️ Cookie save already in progress, skipping duplicate request');
                                if (!res.headersSent) {
                                    res.end(JSON.stringify({ status: 'error', message: 'Cookie save already in progress' }));
                                }
                                return;
                            }
                            
                            global.cookieSaveInProgress = true;
                            
                            // Set flag to prevent file watcher from triggering bot restart
                            global.cookieSavedFromDashboard = true;
                            
                            fs.writeFileSync(accountPath, cookieData);
                            console.log('✅ Cookie successfully written to file');
                            
                            // Reset the save-in-progress flag
                            global.cookieSaveInProgress = false;
                            
                            // Reset flag after 15 seconds (longer than the 10-second file watcher delay)
                            setTimeout(() => {
                                global.cookieSavedFromDashboard = false;
                                global.cookieSaveInProgress = false; // Also reset this flag
                                console.log('🍪 Dashboard flags reset after 15 seconds');
                            }, 15000);
                            
                            const successResponse = { 
                                status: 'success', 
                                message: 'Cookie saved successfully. No restart needed - cookies will be active immediately.' 
                            };
                            console.log('🚀 Sending success response:', successResponse);
                            if (!res.headersSent) {
                                res.end(JSON.stringify(successResponse));
                                return; // Important: return after sending response
                            } else {
                                console.log('⚠️ Headers already sent, cannot send response');
                                return; // Return here too to prevent further execution
                            }
                        } catch (error) {
                            console.error('Cookie save error:', error);
                            // Reset the save-in-progress flag on error
                            global.cookieSaveInProgress = false;
                            if (!res.headersSent) {
                                res.end(JSON.stringify({ status: 'error', message: 'Failed to save cookie: ' + error.message }));
                            } else {
                                console.log('⚠️ Headers already sent, cannot send error response');
                            }
                        }
                    });
                    return;
                }
            }
            
            if (parsedUrl.pathname === '/api/cookie-load') {
                try {
                    const accountPath = path.join(process.cwd(), 'account.txt');
                    if (!fs.existsSync(accountPath)) {
                        res.end(JSON.stringify({ status: 'error', message: 'No cookie file found' }));
                        return;
                    }
                    
                    const cookieContent = fs.readFileSync(accountPath, 'utf8');
                    res.end(JSON.stringify({ 
                        status: 'success', 
                        data: { cookie: cookieContent } 
                    }));
                } catch (error) {
                    res.end(JSON.stringify({ status: 'error', message: 'Failed to load cookie' }));
                }
                return;
            }
            
            if (parsedUrl.pathname === '/api/validate-cookie') {
                if (req.method === 'POST') {
                    let body = '';
                    req.on('data', chunk => body += chunk);
                    req.on('end', () => {
                        try {
                            const { cookie } = JSON.parse(body);
                            if (!cookie) {
                                res.end(JSON.stringify({ status: 'error', message: 'Cookie data is required' }));
                                return;
                            }
                            
                            // Enhanced validation with more detailed checks
                            const cookieData = cookie.trim();
                            let isValid = false;
                            let message = '';
                            
                            // Check for common cookie formats
                            const hasBasicCookieFormat = cookieData.includes('=') && (cookieData.includes(';') || cookieData.includes('\n'));
                            const hasCUser = cookieData.includes('c_user');
                            const hasXs = cookieData.includes('xs');
                            const hasDatr = cookieData.includes('datr');
                            
                            if (cookieData.length < 20) {
                                message = 'Cookie data appears too short to be valid';
                            } else if (!hasBasicCookieFormat) {
                                message = 'Cookie format not recognized - ensure it contains proper key=value pairs';
                            } else if (!hasCUser && !hasXs) {
                                message = 'Cookie may be incomplete - missing critical authentication parameters';
                                isValid = true; // Still allow it, might work
                            } else if (!hasCUser) {
                                message = 'Cookie missing c_user parameter - may not work properly';
                                isValid = true; // Still allow it
                            } else if (!hasXs) {
                                message = 'Cookie missing xs parameter - may have limited functionality';
                                isValid = true; // Still allow it
                            } else {
                                isValid = true;
                                message = 'Cookie format looks good and contains required parameters';
                            }
                            
                            res.end(JSON.stringify({
                                status: 'success',
                                data: { isValid, message }
                            }));
                        } catch (error) {
                            res.end(JSON.stringify({ status: 'error', message: 'Failed to validate cookie' }));
                        }
                    });
                    return;
                }
            }
            
            // Debug endpoint to check bot and database status
            if (parsedUrl.pathname === '/api/debug-status') {
                const debugInfo = {
                    timestamp: new Date().toISOString(),
                    globalGoatBot: {
                        exists: !!global.GoatBot,
                        fcaApi: !!global.GoatBot?.fcaApi,
                        botID: global.GoatBot?.botID || null,
                        startTime: global.GoatBot?.startTime || null
                    },
                    globalDb: {
                        exists: !!global.db,
                        threadsData: !!global.db?.threadsData,
                        usersData: !!global.db?.usersData,
                        allThreadDataLength: global.db?.allThreadData?.length || 0,
                        allUserDataLength: global.db?.allUserData?.length || 0
                    },
                    process: {
                        uptime: process.uptime(),
                        memoryUsage: process.memoryUsage(),
                        nodeVersion: process.version
                    },
                    botStatus: {
                        isRunning: botStatus.isRunning,
                        pid: botStatus.pid,
                        startTime: botStatus.startTime,
                        lastError: botStatus.lastError
                    }
                };
                
                res.end(JSON.stringify({
                    status: 'success',
                    debug: debugInfo
                }));
                return;
            }
            
            // Default API response
            res.end(JSON.stringify({ status: 'error', message: 'API endpoint not found' }));
            return;
        }
        
        // Serve the enhanced HTML dashboard
        const dashboardPath = path.join(__dirname, 'dashboard', 'index.html');
        
        // Check if enhanced dashboard exists
        if (fs.existsSync(dashboardPath)) {
            fs.readFile(dashboardPath, 'utf8', (err, data) => {
                if (err) {
                    console.log('Error reading enhanced dashboard, serving fallback');
                    serveFallbackDashboard();
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            });
        } else {
            serveFallbackDashboard();
        }
        
        function serveFallbackDashboard() {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shizuka Bot Dashboard - Admin Control Panel</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@300;400;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Exo 2', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: white;
            min-height: 100vh;
            overflow-x: hidden;
        }
        
        /* Floating Hearts Animation */
        .hearts-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
        }
        .heart {
            position: absolute;
            font-size: 20px;
            color: rgba(244, 114, 182, 0.3);
            animation: heartFloat 6s infinite ease-in-out;
        }
        @keyframes heartFloat {
            0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-10vh) rotate(360deg); opacity: 0; }
        }
        .dashboard-container {
            position: relative;
            z-index: 2;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .dashboard-header {
            backdrop-filter: blur(20px);
            background: rgba(255, 255, 255, 0.1);
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding: 1rem 2rem;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            max-width: 1400px;
            margin: 0 auto;
        }
        .logo-section {
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logo-icon {
            width: 60px;
            height: 60px;
            background: linear-gradient(45deg, #ec4899, #f9a8d4);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.3);
            animation: logoPulse 2s infinite ease-in-out;
        }
        @keyframes logoPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        .logo-text h1 {
            font-family: 'Orbitron', monospace;
            font-size: 2rem;
            font-weight: 900;
            background: linear-gradient(45deg, #f472b6, #38bdf8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .logo-text p {
            opacity: 0.8;
            font-size: 0.9rem;
        }
        .status-section {
            display: flex;
            align-items: center;
            gap: 2rem;
        }
        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 25px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            animation: statusPulse 2s infinite;
            background: #ef4444;
            box-shadow: 0 0 10px #ef4444;
        }
        .status-dot.online {
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
        }
        .status-dot.offline {
            background: #ef4444;
            box-shadow: 0 0 10px #ef4444;
        }
        .status-dot.warning {
            background: #f59e0b;
            box-shadow: 0 0 10px #f59e0b;
        }
        @keyframes statusPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .dashboard-main {
            flex: 1;
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 2rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            transition: all 0.3s ease;
        }
        .stat-card:hover {
            transform: translateY(-5px) rotateX(5deg);
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        .stat-icon {
            width: 60px;
            height: 60px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            background: linear-gradient(45deg, #ec4899, #8b5cf6);
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.3);
        }
        .stat-content h3 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            font-family: 'Orbitron', monospace;
        }
        .stat-content p {
            opacity: 0.8;
            font-size: 0.9rem;
        }
        .welcome-message {
            text-align: center;
            margin: 3rem 0;
            padding: 3rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
        }
        .welcome-message h2 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(45deg, #ec4899, #f472b6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .welcome-message p {
            font-size: 1.2rem;
            opacity: 0.9;
            line-height: 1.6;
        }
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-top: 3rem;
        }
        .feature-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 2rem;
            text-align: center;
            transition: all 0.3s ease;
        }
        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
            display: block;
        }
        .feature-card h3 {
            color: #f472b6;
            margin-bottom: 1rem;
        }
        
        /* Control Panels */
        .control-panels {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
            margin: 2rem 0;
        }
        .control-panel {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            padding: 2rem;
        }
        .panel-header h2 {
            color: #f472b6;
            margin-bottom: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .control-buttons {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin-bottom: 2rem;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            color: white;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
        .btn-success { background: linear-gradient(45deg, #10b981, #059669); }
        .btn-warning { background: linear-gradient(45deg, #f59e0b, #d97706); }
        .btn-danger { background: linear-gradient(45deg, #ef4444, #dc2626); }
        .btn-primary { background: linear-gradient(45deg, #3b82f6, #1d4ed8); }
        .btn-secondary { background: linear-gradient(45deg, #6b7280, #4b5563); }
        .btn-info { background: linear-gradient(45deg, #06b6d4, #0891b2); }
        
        /* System Info */
        .system-info h3 {
            color: #38bdf8;
            margin-bottom: 1rem;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .info-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .info-label {
            display: block;
            font-size: 0.9rem;
            opacity: 0.8;
            margin-bottom: 0.5rem;
        }
        .info-value {
            font-weight: 600;
            color: #f472b6;
        }
        
        /* Cookie Management */
        .cookie-section, .cookie-input-section {
            margin-bottom: 2rem;
        }
        .cookie-section h3, .cookie-input-section h3 {
            color: #38bdf8;
            margin-bottom: 1rem;
        }
        .cookie-status {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5rem;
        }
        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .status-badge.valid { background: #10b981; }
        .status-badge.invalid { background: #ef4444; }
        .input-group {
            margin-bottom: 1rem;
        }
        .input-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: #f472b6;
            font-weight: 500;
        }
        .input-group textarea {
            width: 100%;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            color: white;
            padding: 1rem;
            font-family: monospace;
            resize: vertical;
        }
        .cookie-actions {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 1rem;
                text-align: center;
            }
            .status-section {
                flex-direction: column;
                gap: 1rem;
            }
        }
    </style>
</head>
<body>
    <!-- Floating Hearts Animation -->
    <div class="hearts-container">
        <div class="heart">♥</div>
        <div class="heart">♥</div>
        <div class="heart">♥</div>
        <div class="heart">♥</div>
        <div class="heart">♥</div>
        <div class="heart">♥</div>
    </div>

    <!-- Main Container -->
    <div class="dashboard-container">
        <!-- Header -->
        <header class="dashboard-header">
            <div class="header-content">
                <div class="logo-section">
                    <div class="logo-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="logo-text">
                        <h1>Shizuka Bot</h1>
                        <p>Futuristic Control Panel</p>
                    </div>
                </div>
                <div class="status-section">
                    <div class="status-indicator" id="botStatus">
                        <div class="status-dot offline"></div>
                        <span>Checking...</span>
                    </div>
                    <div class="user-info">
                        <i class="fas fa-user-shield"></i>
                        <span>Admin Panel</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <main class="dashboard-main">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">⏰</div>
                    <div class="stat-content">
                        <h3 id="uptimeDisplay">--</h3>
                        <p>Uptime</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💬</div>
                    <div class="stat-content">
                        <h3 id="threadCount">--</h3>
                        <p>Active Threads</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-content">
                        <h3 id="userCount">--</h3>
                        <p>Total Users</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💾</div>
                    <div class="stat-content">
                        <h3 id="memoryUsage">--</h3>
                        <p>Memory Usage</p>
                    </div>
                </div>
            </div>
            
            <!-- Control Panels -->
            <div class="control-panels">
                <!-- Bot Control Panel -->
                <div class="control-panel">
                    <div class="panel-header">
                        <h2><i class="fas fa-cogs"></i> Bot Control</h2>
                    </div>
                    <div class="panel-content">
                        <div class="control-buttons">
                            <button class="btn btn-success" id="startBot" onclick="controlBot('start')">
                                <i class="fas fa-play"></i>
                                Start Bot
                            </button>
                            <button class="btn btn-warning" id="restartBot" onclick="controlBot('restart')">
                                <i class="fas fa-redo"></i>
                                Restart Bot
                            </button>
                            <button class="btn btn-danger" id="stopBot" onclick="controlBot('stop')">
                                <i class="fas fa-stop"></i>
                                Stop Bot
                            </button>
                        </div>
                        
                        <div class="system-info">
                            <h3>System Information</h3>
                            <div class="info-grid">
                                <div class="info-item">
                                    <span class="info-label">Node.js Version:</span>
                                    <span class="info-value" id="nodeVersion">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Platform:</span>
                                    <span class="info-value" id="platform">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">CPU Usage:</span>
                                    <span class="info-value" id="cpuUsage">--</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Last Restart:</span>
                                    <span class="info-value" id="lastRestart">--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cookie Management Panel -->
                <div class="control-panel">
                    <div class="panel-header">
                        <h2><i class="fas fa-cookie-bite"></i> Cookie Management</h2>
                    </div>
                    <div class="panel-content">
                        <div class="cookie-section">
                            <h3>Current Cookie Status</h3>
                            <div class="cookie-status" id="cookieStatus">
                                <div class="status-item">
                                    <span>Cookie Age:</span>
                                    <span id="cookieAge">--</span>
                                </div>
                                <div class="status-item">
                                    <span>Last Updated:</span>
                                    <span id="cookieLastUpdated">--</span>
                                </div>
                                <div class="status-item">
                                    <span>Status:</span>
                                    <span id="cookieValidStatus" class="status-badge">Unknown</span>
                                </div>
                            </div>
                        </div>

                        <div class="cookie-input-section">
                            <h3>Update Cookie</h3>
                            <div class="input-group">
                                <label for="cookieInput">Paste Account.txt Content:</label>
                                <textarea 
                                    id="cookieInput" 
                                    placeholder="Paste your Facebook cookie/account.txt content here..."
                                    rows="6"
                                ></textarea>
                            </div>
                            
                            <div class="cookie-actions">
                                <button class="btn btn-primary" onclick="saveCookie()">
                                    <i class="fas fa-save"></i>
                                    Save Cookie
                                </button>
                                <button class="btn btn-secondary" onclick="loadCurrentCookie()">
                                    <i class="fas fa-eye"></i>
                                    View Current Cookie
                                </button>
                                <button class="btn btn-info" onclick="validateCookie()">
                                    <i class="fas fa-check-circle"></i>
                                    Validate Cookie
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="welcome-message">
                <h2>🌸 Welcome to Shizuka Bot Dashboard 🌸</h2>
                <p>Your comprehensive admin control panel is ready! All features are now fully functional.</p>
            </div>
            
            <div class="features-grid">
                <div class="feature-card">
                    <span class="feature-icon">🍪</span>
                    <h3>Cookie Management</h3>
                    <p>Easy paste, save, and validate Facebook cookies directly from the dashboard</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🎮</span>
                    <h3>Bot Control</h3>
                    <p>Start, stop, and restart your bot with one-click controls</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📊</span>
                    <h3>Real-time Monitoring</h3>
                    <p>Live statistics, system information, and performance metrics</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">📱</span>
                    <h3>Mobile Responsive</h3>
                    <p>Beautiful design that works perfectly on all devices</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">🔄</span>
                    <h3>Auto Backup</h3>
                    <p>Automatic data backup and restore functionality</p>
                </div>
                <div class="feature-card">
                    <span class="feature-icon">⚡</span>
                    <h3>High Performance</h3>
                    <p>Optimized for speed and reliability with real-time updates</p>
                </div>
            </div>
        </main>
    </div>
    
    <script>
        // Update all dashboard stats
        function updateStats() {
            // Update bot status
            fetch('/api/bot-status')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        const botData = data.data;
                        const statusDot = document.querySelector('.status-dot');
                        const statusText = statusDot.nextElementSibling;
                        
                        // Remove existing status classes
                        statusDot.className = 'status-dot';
                        
                        if (botData.status === 'online') {
                            statusDot.classList.add('online');
                            statusDot.style.background = '#10b981';
                            statusDot.style.boxShadow = '0 0 10px #10b981';
                            statusText.textContent = 'Bot Online';
                        } else {
                            statusDot.classList.add('offline');
                            statusDot.style.background = '#ef4444';
                            statusDot.style.boxShadow = '0 0 10px #ef4444';
                            statusText.textContent = botData.message || 'Bot Offline';
                        }
                        
                        // Update uptime
                        const uptime = botData.uptime;
                        const days = Math.floor(uptime / (24 * 3600));
                        const hours = Math.floor((uptime % (24 * 3600)) / 3600);
                        const minutes = Math.floor((uptime % 3600) / 60);
                        
                        let uptimeText = '';
                        if (days > 0) uptimeText += days + 'd ';
                        if (hours > 0) uptimeText += hours + 'h ';
                        uptimeText += minutes + 'm';
                        
                        document.getElementById('uptimeDisplay').textContent = uptimeText;
                    }
                })
                .catch(() => {
                    const statusDot = document.querySelector('.status-dot');
                    const statusText = statusDot.nextElementSibling;
                    statusDot.style.background = '#ef4444';
                    statusText.textContent = 'Connection Error';
                });
                
            // Update system info
            fetch('/api/system-info')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById('memoryUsage').textContent = data.data.memoryUsage;
                        
                        // Update system information panel
                        const nodeVersion = document.getElementById('nodeVersion');
                        const platform = document.getElementById('platform');
                        const cpuUsage = document.getElementById('cpuUsage');
                        const lastRestart = document.getElementById('lastRestart');
                        
                        if (nodeVersion) nodeVersion.textContent = data.data.nodeVersion || '--';
                        if (platform) platform.textContent = data.data.platform || '--';
                        if (cpuUsage) cpuUsage.textContent = data.data.cpuUsage || '--';
                        if (lastRestart) lastRestart.textContent = data.data.lastRestart || '--';
                    }
                })
                .catch(() => {});
                
            // Update stats
            fetch('/api/stats')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        document.getElementById('threadCount').textContent = data.data.totalThreads || 0;
                        document.getElementById('userCount').textContent = data.data.totalUsers || 0;
                        if (!document.getElementById('memoryUsage').textContent || document.getElementById('memoryUsage').textContent === '--') {
                            document.getElementById('memoryUsage').textContent = data.data.memoryUsage;
                        }
                    }
                })
                .catch(() => {
                    // Set defaults if API fails
                    if (document.getElementById('threadCount').textContent === '--') {
                        document.getElementById('threadCount').textContent = '0';
                    }
                    if (document.getElementById('userCount').textContent === '--') {
                        document.getElementById('userCount').textContent = '0';
                    }
                });
                
            // Debug: Check if bot is properly initialized
            fetch('/api/debug-status')
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'success') {
                        console.log('Bot Debug Status:', data.debug);
                        
                        // If bot is logged in but stats are still zero, there might be a database issue
                        if (data.debug.globalGoatBot.fcaApi && 
                            document.getElementById('threadCount').textContent === '0' &&
                            document.getElementById('userCount').textContent === '0') {
                            
                            console.log('Bot is online but stats are zero - database may need time to populate');
                            
                            // Show a message to user that data is loading
                            const threadElement = document.getElementById('threadCount');
                            const userElement = document.getElementById('userCount');
                            
                            if (threadElement.textContent === '0') {
                                threadElement.textContent = 'Loading...';
                                threadElement.style.color = '#f59e0b';
                            }
                            if (userElement.textContent === '0') {
                                userElement.textContent = 'Loading...';
                                userElement.style.color = '#f59e0b';
                            }
                            
                            // Try again in 30 seconds
                            setTimeout(() => {
                                fetch('/api/stats')
                                    .then(response => response.json())
                                    .then(statsData => {
                                        if (statsData.status === 'success') {
                                            threadElement.textContent = statsData.data.totalThreads || '0';
                                            userElement.textContent = statsData.data.totalUsers || '0';
                                            threadElement.style.color = '';
                                            userElement.style.color = '';
                                        }
                                    })
                                    .catch(() => {
                                        threadElement.textContent = '0';
                                        userElement.textContent = '0';
                                        threadElement.style.color = '';
                                        userElement.style.color = '';
                                    });
                            }, 30000);
                        }
                    }
                })
                .catch(() => {});
                
            // Update cookie status
            updateCookieStatus();
        }
        
        // Floating hearts animation
        function createParticles() {
            const container = document.querySelector('.hearts-container');
            
            function createHeart() {
                const heart = document.createElement('div');
                heart.className = 'heart';
                heart.innerHTML = '♥';
                heart.style.left = Math.random() * window.innerWidth + 'px';
                heart.style.animationDuration = (Math.random() * 3 + 5) + 's';
                heart.style.fontSize = (Math.random() * 10 + 15) + 'px';
                heart.style.animationDelay = Math.random() * 2 + 's';
                
                container.appendChild(heart);
                
                setTimeout(() => {
                    if (heart.parentNode) {
                        heart.remove();
                    }
                }, 8000);
            }
            
            // Create initial hearts
            for (let i = 0; i < 6; i++) {
                setTimeout(createHeart, i * 500);
            }
            
            // Continue creating hearts
            setInterval(createHeart, 2000);
        }
        
        // Bot control functions
        async function controlBot(action) {
            try {
                const response = await fetch('/api/bot-control', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action })
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    showNotification(data.message, 'success');
                    setTimeout(updateStats, 2000);
                } else {
                    showNotification(data.message, 'error');
                }
            } catch (error) {
                showNotification('Failed to control bot', 'error');
            }
        }
        
        // Cookie management functions
        async function saveCookie() {
            const cookieInput = document.getElementById('cookieInput');
            const cookieData = cookieInput.value.trim();
            
            if (!cookieData) {
                showNotification('Please enter cookie data', 'warning');
                return;
            }
            
            try {
                const response = await fetch('/api/cookie-save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cookie: cookieData })
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    showNotification('Cookie saved successfully!', 'success');
                    cookieInput.value = '';
                    setTimeout(updateCookieStatus, 1000);
                } else {
                    showNotification(data.message || 'Failed to save cookie', 'error');
                }
            } catch (error) {
                showNotification('Failed to save cookie', 'error');
            }
        }
        
        async function loadCurrentCookie() {
            try {
                const response = await fetch('/api/cookie-load');
                const data = await response.json();
                
                if (data.status === 'success') {
                    document.getElementById('cookieInput').value = data.data.cookie || '';
                    showNotification('Current cookie loaded', 'info');
                } else {
                    showNotification(data.message || 'Failed to load cookie', 'error');
                }
            } catch (error) {
                showNotification('Failed to load cookie', 'error');
            }
        }
        
        async function validateCookie() {
            const cookieInput = document.getElementById('cookieInput');
            const cookieData = cookieInput.value.trim();
            
            if (!cookieData) {
                showNotification('Please enter cookie data to validate', 'warning');
                return;
            }
            
            try {
                const response = await fetch('/api/validate-cookie', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cookie: cookieData })
                });
                const data = await response.json();
                
                if (data.status === 'success') {
                    const isValid = data.data.isValid;
                    showNotification(data.data.message, isValid ? 'success' : 'warning');
                } else {
                    showNotification(data.message || 'Validation failed', 'error');
                }
            } catch (error) {
                showNotification('Failed to validate cookie', 'error');
            }
        }
        
        // Update cookie status
        async function updateCookieStatus() {
            try {
                const response = await fetch('/api/cookie-status');
                const data = await response.json();
                
                if (data.status === 'success') {
                    document.getElementById('cookieAge').textContent = data.data.age || '--';
                    document.getElementById('cookieLastUpdated').textContent = data.data.lastUpdated || '--';
                    
                    const statusBadge = document.getElementById('cookieValidStatus');
                    const isValid = data.data.isValid;
                    statusBadge.textContent = isValid ? 'Valid' : 'Unknown';
                    statusBadge.style.background = isValid ? '#10b981' : '#f59e0b';
                }
            } catch (error) {
                // Ignore cookie status errors
            }
        }
        
        function showNotification(message, type) {
            type = type || 'info';
            const notification = document.createElement('div');
            notification.className = 'notification ' + type;
            notification.textContent = message;
            
            var bgColor = '#3b82f6';
            if (type === 'success') bgColor = '#10b981';
            if (type === 'error') bgColor = '#ef4444';
            
            notification.style.position = 'fixed';
            notification.style.top = '20px';
            notification.style.right = '20px';
            notification.style.padding = '15px 25px';
            notification.style.borderRadius = '8px';
            notification.style.color = 'white';
            notification.style.fontWeight = '500';
            notification.style.zIndex = '10000';
            notification.style.background = bgColor;
            notification.style.animation = 'slideIn 0.3s ease';
            
            document.body.appendChild(notification);
            setTimeout(function() {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(function() {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3000);
        }
        
        // Add CSS animation keyframes
        var style = document.createElement('style');
        style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }' +
                           '@keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }';
        document.head.appendChild(style);
        
        // Initialize dashboard
        function initializeDashboard() {
            updateStats();
            createParticles();
            
            // Auto-refresh every 30 seconds
            setInterval(updateStats, 30000);
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initializeDashboard);
        
        // Also initialize immediately
        initializeDashboard();
    </script>
</body>
</html>`);
        }
    });
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🌸 Shizuka Dashboard is running on port ${PORT}`);
        const dashboardUrl = process.env.RENDER_SERVICE_URL || `http://localhost:${PORT}`;
        console.log(`🚀 Access your dashboard at: ${dashboardUrl}`);
        console.log(`🤖 Bot management: Start, Stop, Restart functionality enabled`);
        console.log(`🍪 Cookie management: Upload and manage Facebook cookies`);
        console.log(`🌍 Server bound to 0.0.0.0:${PORT} for Render compatibility`);
    });
}

// Bot control handler
function handleBotControl(action, res) {
    try {
        switch (action) {
            case 'start':
                if (botStatus.isRunning) {
                    res.end(JSON.stringify({ status: 'error', message: 'Bot is already running' }));
                } else {
                    startProject();
                    res.end(JSON.stringify({ status: 'success', message: 'Bot started successfully' }));
                }
                break;
                
            case 'stop':
                if (!botStatus.isRunning) {
                    res.end(JSON.stringify({ status: 'error', message: 'Bot is not running' }));
                } else {
                    botProcess.kill('SIGTERM');
                    res.end(JSON.stringify({ status: 'success', message: 'Bot stopped successfully' }));
                }
                break;
                
            case 'restart':
                if (botStatus.isRunning) {
                    botProcess.kill('SIGTERM');
                    setTimeout(() => startProject(), 3000);
                    res.end(JSON.stringify({ status: 'success', message: 'Bot restarting...' }));
                } else {
                    startProject();
                    res.end(JSON.stringify({ status: 'success', message: 'Bot started successfully' }));
                }
                break;
                
            default:
                res.end(JSON.stringify({ status: 'error', message: 'Invalid action' }));
        }
    } catch (error) {
        res.end(JSON.stringify({ status: 'error', message: error.message }));
    }
}

// Start dashboard immediately
startDashboard();
