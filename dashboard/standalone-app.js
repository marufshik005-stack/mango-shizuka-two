const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs-extra");
const session = require("express-session");
const eta = require("eta");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const http = require("http");
const server = http.createServer(app);

// Initialize basic global structure if not present
if (!global.GoatBot) {
    // Load config
    const config = require('../config.json');
    
    global.GoatBot = {
        config: config,
        fcaApi: null,
        botID: null
    };
}

if (!global.utils) {
    global.utils = {
        getText: (category, key, ...args) => key, // Simple fallback
        log: {
            info: console.log,
            error: console.error,
            warn: console.warn
        }
    };
}

// Simple random string generator
function randomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = async () => {
    const { config } = global.GoatBot;
    
    // Configure eta
    eta.configure({
        useWith: true
    });

    app.set("views", `${__dirname}/views`);
    app.engine("eta", eta.renderFile);
    app.set("view engine", "eta");

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(session({
        secret: randomString(10),
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false,
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
        }
    }));

    // Public folder 
    app.use("/css", express.static(`${__dirname}/css`));
    app.use("/js", express.static(`${__dirname}/js`));
    app.use("/images", express.static(`${__dirname}/images`));

    app.use(flash());
    app.use(function (req, res, next) {
        res.locals.success = req.flash("success") || [];
        res.locals.errors = req.flash("errors") || [];
        res.locals.warnings = req.flash("warnings") || [];
        res.locals.user = null;
        next();
    });

    // Root route - serve the Shizuka dashboard
    app.get(["/", "/home"], (req, res) => {
        try {
            res.render("admin-dashboard");
        } catch (error) {
            console.error("Dashboard render error:", error);
            res.send(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Shizuka Bot Dashboard</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                            color: white;
                            text-align: center;
                            padding: 50px;
                            margin: 0;
                        }
                        .container {
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 40px;
                            background: rgba(255,255,255,0.1);
                            border-radius: 20px;
                            backdrop-filter: blur(10px);
                            border: 1px solid rgba(255,255,255,0.2);
                        }
                        h1 { color: #ec4899; }
                        .error {
                            background: rgba(239, 68, 68, 0.2);
                            padding: 20px;
                            border-radius: 10px;
                            margin: 20px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🌸 Shizuka Dashboard Loading...</h1>
                        <div class="error">
                            <p>Dashboard template not found. The bot may still be initializing.</p>
                            <p>Please wait a moment and refresh the page.</p>
                        </div>
                        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #ec4899; color: white; border: none; border-radius: 5px; cursor: pointer;">🔄 Refresh</button>
                    </div>
                </body>
                </html>
            `);
        }
    });

    // Stats endpoint
    app.get("/stats", (req, res) => {
        res.json({
            totalThread: 0,
            totalUser: 0,
            prefix: config.prefix || ".",
            uptime: process.uptime()
        });
    });

    // API Routes for basic functionality
    app.get('/api/bot-status', (req, res) => {
        const isRunning = global.GoatBot?.fcaApi !== null;
        res.json({
            status: 'success',
            data: {
                status: isRunning ? 'online' : 'offline',
                message: isRunning ? 'Bot is running' : 'Bot is offline',
                uptime: process.uptime(),
                botID: global.GoatBot?.botID,
                isLoggedIn: !!global.GoatBot?.fcaApi
            }
        });
    });

    app.get('/api/system-info', (req, res) => {
        const os = require('os');
        const memoryUsage = process.memoryUsage();
        
        res.json({
            status: 'success',
            data: {
                nodeVersion: process.version,
                platform: `${os.type()} ${os.release()}`,
                memoryUsage: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                uptime: process.uptime(),
                lastRestart: new Date(Date.now() - process.uptime() * 1000).toLocaleString()
            }
        });
    });

    app.get('/api/cookie-status', (req, res) => {
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
            const isValid = !!global.GoatBot?.fcaApi;

            res.json({
                status: 'success',
                data: {
                    exists: true,
                    age: ageInHours < 24 ? `${Math.floor(ageInHours)} hours` : `${Math.floor(ageInHours / 24)} days`,
                    lastUpdated: lastUpdated,
                    isValid: isValid
                }
            });

        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to get cookie status'
            });
        }
    });

    // Cookie management endpoints
    app.post('/api/save-cookie', (req, res) => {
        try {
            const { cookie } = req.body;
            
            if (!cookie || typeof cookie !== 'string') {
                return res.status(400).json({
                    status: 'error',
                    message: 'Cookie data is required'
                });
            }

            const accountPath = path.join(process.cwd(), 'account.txt');
            fs.writeFileSync(accountPath, cookie.trim());

            res.json({
                status: 'success',
                message: 'Cookie saved successfully! Please restart the bot to apply changes.'
            });

        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to save cookie'
            });
        }
    });

    app.get('/api/get-cookie', (req, res) => {
        try {
            const accountPath = path.join(process.cwd(), 'account.txt');
            
            if (!fs.existsSync(accountPath)) {
                return res.json({
                    status: 'success',
                    data: { cookie: '' }
                });
            }

            const cookie = fs.readFileSync(accountPath, 'utf8');
            
            res.json({
                status: 'success',
                data: { cookie: cookie }
            });

        } catch (error) {
            res.status(500).json({
                status: 'error',
                message: 'Failed to read cookie file'
            });
        }
    });

    // Bot control endpoints
    app.post('/api/bot-restart', (req, res) => {
        res.json({
            status: 'success',
            message: 'Bot restart command sent. The application will restart shortly.'
        });

        // Restart after sending response
        setTimeout(() => {
            process.exit(2);
        }, 1000);
    });

    // 404 handler
    app.get("*", (req, res) => {
        res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Page Not Found</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                        color: white;
                        text-align: center;
                        padding: 50px;
                        margin: 0;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px;
                        background: rgba(255,255,255,0.1);
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                    h1 { color: #ec4899; }
                    a {
                        color: #f472b6;
                        text-decoration: none;
                        padding: 10px 20px;
                        background: rgba(236, 72, 153, 0.2);
                        border-radius: 5px;
                        display: inline-block;
                        margin: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🌸 Page Not Found</h1>
                    <p>The page you're looking for doesn't exist.</p>
                    <a href="/">🏠 Go to Dashboard</a>
                </div>
            </body>
            </html>
        `);
    });

    const PORT = config.dashBoard?.port || 3001;
    
    await server.listen(PORT);
    
    console.log(`🌸 Shizuka Dashboard is running on port ${PORT}`);
    console.log(`🚀 Access your dashboard at: http://localhost:${PORT}`);
    
    return app;
};