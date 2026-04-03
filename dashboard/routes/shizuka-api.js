const express = require('express');
const router = express.Router();
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const { spawn, exec } = require('child_process');
const os = require('os');

module.exports = (params) => {
    const { 
        isAuthenticated, 
        isVeryfiUserIDFacebook, 
        config, 
        threadsData, 
        usersData 
    } = params;

	// Middleware to check admin access
	const isAdmin = (req, res, next) => {
		// Bypass authentication for production/Render deployment
		if (process.env.NODE_ENV === 'production' || process.env.RENDER_SERVICE_URL) {
			return next();
		}
		
		if (!config.adminBot.includes(req.user?.facebookUserID)) {
			return res.status(403).json({
				status: 'error',
				message: 'Admin access required'
			});
		}
		next();
	};
	
	// Bypass middleware for production
	const bypassAuthForProduction = (req, res, next) => {
		if (process.env.NODE_ENV === 'production' || process.env.RENDER_SERVICE_URL) {
			return next();
		}
		// In development, use normal auth flow
		return isAuthenticated(req, res, next);
	};

	// Bot Status API
	router.get('/bot-status', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            const uptime = process.uptime();
            const isRunning = global.GoatBot?.fcaApi !== null;
            const botID = global.GoatBot?.botID;
            
            let status = 'offline';
            let message = 'Bot is offline';
            
            if (isRunning && botID) {
                status = 'online';
                message = 'Bot is running normally';
            } else if (global.GoatBot?.reLoginBot) {
                status = 'warning';
                message = 'Bot connection unstable';
            }

            res.json({
                status: 'success',
                data: {
                    status: status,
                    message: message,
                    uptime: uptime,
                    botID: botID,
                    startTime: global.GoatBot?.startTime,
                    isLoggedIn: !!global.GoatBot?.fcaApi
                }
            });

        } catch (error) {
            console.error('Bot status error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get bot status'
            });
        }
    });

	// System Information API
	router.get('/system-info', bypassAuthForProduction, isAdmin, (req, res) => {
        try {
            const memoryUsage = process.memoryUsage();
            const cpuUsage = process.cpuUsage();
            
            res.json({
                status: 'success',
                data: {
                    nodeVersion: process.version,
                    platform: `${os.type()} ${os.release()}`,
                    cpuUsage: `${(cpuUsage.user / 1000000).toFixed(2)}s`,
                    memoryUsage: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
                    uptime: process.uptime(),
                    lastRestart: new Date(Date.now() - process.uptime() * 1000).toLocaleString()
                }
            });

        } catch (error) {
            console.error('System info error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get system information'
            });
        }
    });

	// Cookie Status API
	router.get('/cookie-status', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            const accountPath = path.join(process.cwd(), 'account.txt');
            
            if (!fs.existsSync(accountPath)) {
                return res.json({
                    status: 'success',
                    data: {
                        exists: false,
                        age: 'No cookie found',
                        lastUpdated: 'Never',
                        isValid: false
                    }
                });
            }

            const stats = fs.statSync(accountPath);
            const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
            const lastUpdated = stats.mtime.toLocaleString();
            
            // Check if bot is currently logged in as a proxy for cookie validity
            const isValid = !!global.GoatBot?.fcaApi;

            res.json({
                status: 'success',
                data: {
                    exists: true,
                    age: ageInHours < 24 ? `${Math.floor(ageInHours)} hours` : `${Math.floor(ageInHours / 24)} days`,
                    lastUpdated: lastUpdated,
                    isValid: isValid,
                    size: `${(stats.size / 1024).toFixed(2)} KB`
                }
            });

        } catch (error) {
            console.error('Cookie status error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to get cookie status'
            });
        }
    });

	// Get Current Cookie API
	router.get('/get-cookie', bypassAuthForProduction, isAdmin, (req, res) => {
        try {
            const accountPath = path.join(process.cwd(), 'account.txt');
            
            if (!fs.existsSync(accountPath)) {
                return res.json({
                    status: 'success',
                    data: {
                        cookie: ''
                    }
                });
            }

            const cookie = fs.readFileSync(accountPath, 'utf8');
            
            res.json({
                status: 'success',
                data: {
                    cookie: cookie
                }
            });

        } catch (error) {
            console.error('Get cookie error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to read cookie file'
            });
        }
    });

	// Save Cookie API
	router.post('/save-cookie', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            const { cookie } = req.body;
            
            if (!cookie || typeof cookie !== 'string' || cookie.trim().length === 0) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cookie data is required'
                });
            }

            // Basic validation - check if it looks like Facebook cookie data
            const cookieData = cookie.trim();
            if (!cookieData.includes('c_user') && !cookieData.includes('xs') && !cookieData.startsWith('[')) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid cookie format. Please provide valid Facebook cookie data.'
                });
            }

            // Save cookie to account.txt
            const accountPath = path.join(process.cwd(), 'account.txt');
            fs.writeFileSync(accountPath, cookieData);

            res.json({
                status: 'success',
                message: 'Cookie saved successfully. Please restart the bot to apply changes.'
            });

        } catch (error) {
            console.error('Save cookie error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to save cookie'
            });
        }
    });

	// Validate Cookie API
	router.post('/validate-cookie', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            const { cookie } = req.body;
            
            if (!cookie || typeof cookie !== 'string') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cookie data is required'
                });
            }

            const cookieData = cookie.trim();
            let isValid = false;
            let validationMessage = '';

            // Basic validation checks
            if (cookieData.length < 50) {
                validationMessage = 'Cookie appears too short';
            } else if (!cookieData.includes('c_user')) {
                validationMessage = 'Missing c_user parameter';
            } else if (!cookieData.includes('xs')) {
                validationMessage = 'Missing xs parameter';
            } else {
                isValid = true;
                validationMessage = 'Cookie format appears valid';
            }

            res.json({
                status: 'success',
                data: {
                    isValid: isValid,
                    message: validationMessage
                }
            });

        } catch (error) {
            console.error('Validate cookie error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to validate cookie'
            });
        }
    });

	// Bot Control APIs
	router.post('/bot-start', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            if (global.GoatBot?.fcaApi) {
                return res.json({
                    status: 'info',
                    message: 'Bot is already running'
                });
            }

            // Restart the process to start the bot
            res.json({
                status: 'success',
                message: 'Bot start command sent. Please wait a moment for the bot to initialize.'
            });

            // Restart after sending response
            setTimeout(() => {
                process.exit(2);
            }, 1000);

        } catch (error) {
            console.error('Bot start error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to start bot'
            });
        }
    });

	router.post('/bot-restart', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            res.json({
                status: 'success',
                message: 'Bot restart command sent. The bot will restart shortly.'
            });

            // Restart after sending response
            setTimeout(() => {
                process.exit(2);
            }, 1000);

        } catch (error) {
            console.error('Bot restart error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to restart bot'
            });
        }
    });

	router.post('/bot-stop', bypassAuthForProduction, isAdmin, async (req, res) => {
        try {
            if (global.GoatBot?.fcaApi) {
                global.GoatBot.fcaApi.logout();
                global.GoatBot.fcaApi = null;
            }

            res.json({
                status: 'success',
                message: 'Bot stopped successfully'
            });

        } catch (error) {
            console.error('Bot stop error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to stop bot'
            });
        }
    });

	// Logs API
	router.get('/logs', bypassAuthForProduction, isAdmin, (req, res) => {
        try {
            // Try to read recent logs from console or log file
            const logContent = 'Real-time logs are not available in this version.\n' +
                             'Bot Status: ' + (global.GoatBot?.fcaApi ? 'Running' : 'Stopped') + '\n' +
                             'Uptime: ' + Math.floor(process.uptime()) + ' seconds\n' +
                             'Memory Usage: ' + (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB\n' +
                             'Last Updated: ' + new Date().toLocaleString();

            res.type('text/plain').send(logContent);

        } catch (error) {
            console.error('Logs error:', error);
            res.type('text/plain').send('Failed to retrieve logs: ' + error.message);
        }
    });

	// Backup Data API
	router.get('/backup-data', bypassAuthForProduction, isAdmin, (req, res) => {
        try {
            const archive = archiver('zip', {
                zlib: { level: 9 }
            });

            res.attachment('shizuka-bot-backup.zip');
            archive.pipe(res);

            // Add important files to backup
            const filesToBackup = [
                'config.json',
                'configCommands.json',
                'account.txt',
                'package.json'
            ];

            filesToBackup.forEach(file => {
                const filePath = path.join(process.cwd(), file);
                if (fs.existsSync(filePath)) {
                    archive.file(filePath, { name: file });
                }
            });

            // Add directories
            const dirsToBackup = [
                'scripts/cmds',
                'scripts/events',
                'languages'
            ];

            dirsToBackup.forEach(dir => {
                const dirPath = path.join(process.cwd(), dir);
                if (fs.existsSync(dirPath)) {
                    archive.directory(dirPath, dir);
                }
            });

            archive.finalize();

        } catch (error) {
            console.error('Backup error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to create backup'
            });
        }
    });

	// Clear Cache API
	router.post('/clear-cache', bypassAuthForProduction, isAdmin, (req, res) => {
        try {
            // Clear temporary data
            if (global.temp) {
                global.temp.createThreadData = [];
                global.temp.createUserData = [];
                global.temp.createThreadDataError = [];
                global.temp.filesOfGoogleDrive = {
                    arraybuffer: {},
                    stream: {},
                    fileNames: {}
                };
            }

            // Clear client cache
            if (global.client?.cache) {
                global.client.cache = {};
            }

            // Force garbage collection if available
            if (global.gc) {
                global.gc();
            }

            res.json({
                status: 'success',
                message: 'Cache cleared successfully'
            });

        } catch (error) {
            console.error('Clear cache error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to clear cache'
            });
        }
    });

    return router;
};