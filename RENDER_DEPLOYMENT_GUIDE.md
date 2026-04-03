# 🌸 Shizuka Bot Render Deployment Guide

## 🚀 Dashboard Features

Your dashboard now includes:

### ✅ **Real-time Bot Management**
- **Start/Stop/Restart** bot with one-click buttons
- **Live status indicators** showing bot online/offline status
- **Process monitoring** with PID and uptime tracking
- **System information** display (memory usage, Node.js version, etc.)

### 🍪 **Cookie Management**
- **Upload Facebook cookies** directly through the dashboard
- **View current cookie status** and age
- **Validate cookie** functionality
- **Cookie backup** and restore capabilities

### 📊 **Monitoring Dashboard**
- **Real-time statistics** (uptime, memory usage, active threads)
- **System performance** metrics
- **Error logging** and status messages
- **Mobile-responsive** beautiful UI

## 🔧 Deployment Steps

1. **Connect to Render:**
   - Go to [render.com](https://render.com)
   - Connect your GitHub account
   - Select your `shizuka-mongotwo` repository

2. **Configure Environment Variables:**
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   ```

3. **Deploy:**
   - Render will automatically use the `render.yaml` configuration
   - The bot will start with the dashboard on the assigned port

## 🎯 Dashboard Access

After deployment:
- **Dashboard URL**: `https://your-app-name.onrender.com`
- **Bot Status API**: `https://your-app-name.onrender.com/api/bot-status`
- **System Info**: `https://your-app-name.onrender.com/api/system-info`

## 🎮 Bot Control Features

### Dashboard Buttons:
- **▶️ Start Bot**: Starts the bot process
- **🔄 Restart Bot**: Restarts the bot (useful after cookie updates)
- **⏹️ Stop Bot**: Stops the bot process

### Status Indicators:
- **🟢 Green dot**: Bot is online and running
- **🔴 Red dot**: Bot is offline or has errors
- **⏳ Yellow dot**: Bot is starting/restarting

## 🍪 Managing Facebook Cookies

1. **Access Dashboard** → Cookie Management section
2. **Copy your account.txt content** from Facebook login
3. **Paste in the textarea** in the dashboard
4. **Click "Save Cookie"**
5. **Restart the bot** to apply changes

## 📱 Mobile Access

The dashboard is fully responsive and works perfectly on:
- 📱 Mobile phones
- 📱 Tablets  
- 💻 Desktop computers

## 🛠️ Troubleshooting

### Bot Won't Start:
- Check the **Cookie Status** - ensure valid Facebook cookies
- Look at **System Info** for error messages
- Try **Restart Bot** button

### Dashboard Not Loading:
- Check Render deployment logs
- Ensure all environment variables are set
- Verify MongoDB connection string

### Bot Going Offline:
- Facebook may have flagged the account
- Update cookies using the dashboard
- Check for rate limiting or account restrictions

## 🔔 Important Notes

- **Always update cookies** when the bot goes offline unexpectedly
- **Use the dashboard** instead of manual restarts
- **Monitor the status indicators** for real-time updates
- **The bot auto-restarts** on crashes (code 2)

## 📞 Support

If you encounter issues:
1. Check the dashboard status indicators
2. Look at system information for error details  
3. Try restarting through the dashboard
4. Update Facebook cookies if authentication fails

## 🎉 Enjoy Your Bot!

Your Shizuka bot now has a beautiful, functional dashboard that makes management easy and enjoyable! 🌸✨