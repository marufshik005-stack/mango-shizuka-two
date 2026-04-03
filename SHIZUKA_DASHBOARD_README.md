# 🌸 Shizuka Bot - 3D Futuristic Dashboard

## 🎯 Overview

Your GoatBot now features a stunning **3D Futuristic Shizuka-themed Dashboard** with a comprehensive admin panel! This beautiful interface replaces the simple "Bot is running!" text with a professional, interactive control center perfect for managing your bot on Render or any hosting platform.

## ✨ Features

### 🎨 Visual Features
- **3D Glassmorphism Design**: Modern glass-like effects with blur and transparency
- **Shizuka Pink Theme**: Beautiful gradient backgrounds inspired by Shizuka's signature colors
- **Floating Hearts**: Animated hearts that float across the screen
- **Particle System**: Dynamic floating particles for a magical atmosphere
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dark Futuristic Theme**: Cyberpunk-inspired dark background with neon accents

### 🔧 Admin Panel Features
- **Real-time Bot Status**: Live monitoring with status indicators (Online/Offline/Warning)
- **Cookie Management**: Easy paste, save, and validate Facebook cookies
- **Bot Control**: Start, Stop, and Restart buttons with one click
- **System Monitoring**: Real-time CPU, memory, and uptime statistics
- **Backup & Restore**: Download complete bot backups as ZIP files
- **Log Viewer**: Access bot logs directly in the dashboard
- **Cache Management**: Clear bot cache to improve performance

### 📊 Dashboard Components

#### 1. **Header Section**
- Animated Shizuka Bot logo with pulsing effect
- Real-time bot status indicator with color-coded dots
- Admin panel identification

#### 2. **Statistics Cards**
- **Uptime**: Shows how long the bot has been running
- **Active Threads**: Number of active chat threads
- **Total Users**: Total registered users
- **Memory Usage**: Current RAM consumption

#### 3. **Bot Control Panel**
- Start/Stop/Restart buttons with loading states
- System information display
- Performance monitoring

#### 4. **Cookie Management Panel**
- Cookie status checker (age, validity, last updated)
- Textarea for pasting account.txt content
- Save, View, and Validate cookie functions
- Automatic bot restart after cookie update

#### 5. **Quick Actions**
- View Logs button with modal popup
- Backup Data for downloading bot files
- Clear Cache for performance optimization
- Refresh Stats for real-time updates

## 🚀 Installation & Setup

### Files Created:
```
dashboard/
├── views/
│   └── admin-dashboard.eta          # Main dashboard template
├── css/
│   └── shizuka-dashboard.css        # 3D styling and animations
├── js/
│   └── shizuka-dashboard.js         # Interactive functionality
└── routes/
    └── shizuka-api.js               # API endpoints for bot management
```

### Dependencies:
All required dependencies are already included in your `package.json`:
- `express` - Web server
- `archiver` - For backup functionality
- `fs-extra` - File system operations

## 🎮 How to Use

### 1. **Access the Dashboard**
- Visit your bot's URL (e.g., `https://your-app.render.com`)
- Login with your Facebook account
- If you're an admin, you'll see the Shizuka Dashboard automatically

### 2. **Cookie Management**
1. **Get your Facebook cookie**:
   - Use browser extension or developer tools
   - Copy the entire cookie data

2. **Update in Dashboard**:
   - Paste cookie data in the "Cookie Management" section
   - Click "Save Cookie"
   - Click "Restart Bot" to apply changes

3. **Validate Cookie**:
   - Use "Validate Cookie" to check if cookie format is correct
   - Status shows "Valid" or "Invalid" with age information

### 3. **Bot Control**
- **Start Bot**: Initialize the bot (restarts the process)
- **Restart Bot**: Completely restart the application
- **Stop Bot**: Stop the bot while keeping the dashboard running

### 4. **Monitoring**
- Dashboard updates every 30 seconds automatically
- View real-time statistics and system information
- Check bot status with color-coded indicators:
  - 🟢 **Green**: Bot is online and working
  - 🔴 **Red**: Bot is offline
  - 🟡 **Yellow**: Bot has warnings or connection issues

## 🎨 Customization

### Theme Colors
The dashboard uses CSS custom properties that can be easily customized:

```css
:root {
    --shizuka-pink-500: #ec4899;    /* Primary pink */
    --shizuka-pink-400: #f472b6;    /* Secondary pink */
    --doraemon-blue: #0095d9;       /* Accent blue */
    --cyber-purple: #8b5cf6;        /* Purple accents */
    --neon-green: #10b981;          /* Success color */
}
```

### Animation Settings
- **Floating Hearts**: 6-second animation cycle
- **Particles**: 8-second floating animation
- **Auto-refresh**: 30-second intervals (configurable)

## 🔧 API Endpoints

The dashboard includes these API endpoints:

- `GET /api/bot-status` - Get current bot status
- `GET /api/system-info` - Get system information
- `GET /api/cookie-status` - Get cookie information
- `POST /api/save-cookie` - Save new cookie
- `POST /api/validate-cookie` - Validate cookie format
- `POST /api/bot-start` - Start the bot
- `POST /api/bot-restart` - Restart the bot
- `POST /api/bot-stop` - Stop the bot
- `GET /api/logs` - View bot logs
- `GET /api/backup-data` - Download backup
- `POST /api/clear-cache` - Clear bot cache

## 🛡️ Security Features

- **Admin-only Access**: Only users in `config.adminBot` array can access admin features
- **Session Authentication**: Requires Facebook login
- **CSRF Protection**: Built-in protection against cross-site requests
- **Input Validation**: Cookie data is validated before saving
- **Rate Limiting**: Built-in rate limiting for API endpoints

## 📱 Mobile Support

The dashboard is fully responsive:
- Touch-friendly buttons and controls
- Mobile-optimized layouts
- Swipe gestures support
- Adaptive font sizes and spacing

## 🔄 Perfect for Render Hosting

This dashboard is specifically designed for Render hosting:

1. **Easy Cookie Updates**: No need to redeploy when cookies expire
2. **One-click Restart**: Restart your bot directly from the web interface
3. **Real-time Monitoring**: Monitor your bot's health 24/7
4. **Mobile Management**: Manage your bot from your phone
5. **Backup System**: Download your bot data anytime

## 🎉 Usage Example

### Typical Workflow on Render:

1. **Deploy your bot** to Render
2. **Access the dashboard** via your Render URL
3. **Login** with your Facebook admin account
4. **Paste your cookie** in the Cookie Management panel
5. **Save & Restart** the bot
6. **Monitor** bot status in real-time
7. **Update cookie** when it expires (every few days/weeks)
8. **Restart** bot without redeploying

## 🐛 Troubleshooting

### Common Issues:

1. **Dashboard not showing**: 
   - Make sure you're logged in as an admin user
   - Check that your Facebook ID is in `config.adminBot` array

2. **Cookie not saving**:
   - Ensure cookie format is valid (contains `c_user` and `xs`)
   - Check file permissions on the server

3. **Bot not restarting**:
   - Wait 30-60 seconds for process restart
   - Check Render logs for any errors

4. **Animations not working**:
   - Ensure JavaScript is enabled
   - Try refreshing the page
   - Check browser compatibility (Chrome/Firefox/Safari recommended)

## 🎊 Success!

Your bot now has a **professional, beautiful, and functional dashboard** that:

✅ Replaces boring "Bot is running!" text  
✅ Provides full admin control  
✅ Works perfectly on Render  
✅ Allows easy cookie management  
✅ Monitors bot health in real-time  
✅ Supports mobile devices  
✅ Includes backup functionality  
✅ Features stunning 3D animations  

**Enjoy your new Shizuka-themed futuristic dashboard! 🌸✨**