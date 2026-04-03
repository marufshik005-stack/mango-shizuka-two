/**
 * Quick installation script for Unsent Message Tracker
 * Run this script to automatically install the feature
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Installing Unsent Message Tracker...');

// Check if we're in a bot directory
if (!fs.existsSync('scripts') || !fs.existsSync('config.json')) {
    console.log('❌ Error: Please run this script from your bot root directory');
    process.exit(1);
}

// Create scripts directories if they don't exist
if (!fs.existsSync('scripts/events')) {
    fs.mkdirSync('scripts/events', { recursive: true });
    console.log('✅ Created scripts/events directory');
}

if (!fs.existsSync('scripts/cmds')) {
    fs.mkdirSync('scripts/cmds', { recursive: true });
    console.log('✅ Created scripts/cmds directory');
}

// Copy files
try {
    // Copy event handler
    fs.copyFileSync(
        path.join(__dirname, 'unsendTracker.js'),
        'scripts/events/unsendTracker.js'
    );
    console.log('✅ Installed unsendTracker.js');

    // Copy toggle command
    fs.copyFileSync(
        path.join(__dirname, 'trackunsend.js'),
        'scripts/cmds/trackunsend.js'
    );
    console.log('✅ Installed trackunsend.js');

    // Copy modified unsend command
    fs.copyFileSync(
        path.join(__dirname, 'unsend.js'),
        'scripts/cmds/unsend.js'
    );
    console.log('✅ Updated unsend.js');

    // Update config.json
    const configPath = 'config.json';
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!config.vipUsers) {
        config.vipUsers = [];
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('✅ Added vipUsers array to config.json');
    } else {
        console.log('ℹ️  vipUsers already exists in config.json');
    }

    console.log('\n🎉 Installation complete!');
    console.log('\n📝 Next steps:');
    console.log('1. Add VIP user IDs to config.json vipUsers array');
    console.log('2. Restart your bot');
    console.log('3. Use -trackunsend on to enable in a chat');
    console.log('\n📖 See IMPLEMENTATION_GUIDE.md for detailed instructions');

} catch (error) {
    console.log('❌ Installation failed:', error.message);
    process.exit(1);
}