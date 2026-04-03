# Shizuka Theme & Admin Panel for GoatBot

## 🌸 Overview

This update brings a beautiful Shizuka-themed interface to your GoatBot dashboard, inspired by the beloved Doraemon character. The theme features a pink color palette, floating hearts, and a comprehensive admin panel for easy bot management.

## ✨ New Features

### 🎨 Shizuka Theme
- **Pink Color Palette**: Beautiful gradient backgrounds with Shizuka-inspired pink tones
- **Floating Hearts**: Animated hearts that float across the screen
- **Modern UI**: Glass-morphism effects with rounded corners and smooth animations
- **Responsive Design**: Works perfectly on desktop and mobile devices

### 👑 Admin Panel
- **Bot Status Monitoring**: Real-time bot status, uptime, and statistics
- **Cookie Management**: Easy cookie paste functionality to replace manual account.txt editing
- **Quick Actions**: Start, stop, restart bot with one click
- **System Information**: Monitor memory usage, CPU, and Node.js version
- **Log Viewer**: View bot logs directly in the web interface
- **Data Backup**: Create automatic backups of your bot data

## 🚀 Installation

1. **Install Dependencies**:
   ```bash
   npm install archiver
   ```

2. **Access the Admin Panel**:
   - Navigate to `/admin-panel` in your browser
   - Only admin users can access this panel
   - The admin panel link appears in the navigation for admin users

## 🎯 How to Use

### Cookie Management
1. Go to the Admin Panel
2. In the "Cookie Management" section, you can:
   - **Paste Cookie**: Copy your Facebook cookie JSON and paste it directly
   - **Upload File**: Drag and drop a cookie file or click to browse
   - **Save Cookie**: The cookie will be automatically saved to `account.txt`
   - **Start Bot**: Start the bot with the new cookie

### Bot Management
- **Start Bot**: Initialize the bot with current settings
- **Stop Bot**: Safely stop the bot
- **Restart Bot**: Restart the bot (requires process manager)
- **View Logs**: Open bot logs in a new tab
- **Backup Data**: Download a ZIP file with all bot data

### Dashboard Features
- **Shizuka Theme**: Beautiful pink interface with floating hearts
- **Thread Management**: Manage your bot's threads with the new Shizuka styling
- **Real-time Stats**: Monitor bot performance and statistics
- **Responsive Design**: Works on all screen sizes

## 🎨 Theme Customization

The Shizuka theme uses CSS custom properties that can be easily customized:

```css
:root {
  --shizuka-pink-500: #ec4899;
  --doraemon-blue: #0095d9;
  --shizuka-bg-primary: linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%);
}
```

## 🔧 API Endpoints

New API endpoints for admin functionality:

- `GET /api/bot-status` - Get bot status and statistics
- `POST /api/save-cookie` - Save Facebook cookie
- `POST /api/start-bot` - Start the bot
- `POST /api/stop-bot` - Stop the bot
- `POST /api/restart-bot` - Restart the bot
- `GET /api/system-info` - Get system information
- `GET /api/logs` - View bot logs
- `GET /api/backup-data` - Download bot data backup

## 🛡️ Security

- Admin panel is protected by authentication
- Only users with `isAdmin` flag can access admin features
- All API endpoints require authentication
- Cookie data is validated before saving

## 🎉 Features Highlights

### Visual Enhancements
- **Floating Hearts**: Animated hearts that create a magical atmosphere
- **Gradient Backgrounds**: Beautiful pink gradients throughout the interface
- **Glass Morphism**: Modern glass-like effects with backdrop blur
- **Smooth Animations**: Hover effects and transitions for better UX

### Admin Panel Features
- **Real-time Monitoring**: Live bot status and performance metrics
- **Easy Cookie Management**: No more manual file editing
- **One-Click Actions**: Start, stop, and restart bot easily
- **System Monitoring**: Track resource usage and performance
- **Data Backup**: Automatic backup creation and download

## 🐛 Troubleshooting

### Common Issues
1. **Admin Panel Not Showing**: Ensure your user account has `isAdmin: true`
2. **Cookie Not Saving**: Check that the JSON format is valid
3. **Bot Not Starting**: Verify the cookie is properly formatted
4. **Floating Hearts Not Showing**: Check browser console for JavaScript errors

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 📱 Mobile Support

The Shizuka theme is fully responsive and works great on mobile devices:
- Touch-friendly buttons and controls
- Optimized layouts for small screens
- Swipe gestures for better navigation
- Mobile-specific styling adjustments

## 🎨 Color Palette

The Shizuka theme uses a carefully selected color palette:

- **Primary Pink**: #ec4899 (Shizuka's signature pink)
- **Secondary Pink**: #f472b6 (Lighter pink for accents)
- **Doraemon Blue**: #0095d9 (Doraemon's blue for contrast)
- **Background**: Gradient from #fce7f3 to #f9a8d4
- **Text**: #831843 (Dark pink for readability)

## 💝 Special Thanks

This theme is inspired by Shizuka Minamoto from the Doraemon series, bringing her cheerful and caring personality to your bot management experience.

---

**Enjoy your new Shizuka-themed GoatBot experience! 💕**
