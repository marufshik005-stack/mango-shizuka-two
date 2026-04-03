const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');

/**
 * Generate a basic slapping template image
 * This creates a simple template with placeholder areas for profile pictures
 * In production, you should replace this with an actual meme template
 */
async function generateSlapTemplate() {
    const canvas = createCanvas(500, 300);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 500, 300);

    // Draw a basic slapping scene
    ctx.fillStyle = '#333';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('SLAP MEME TEMPLATE', 250, 30);

    // Draw placeholder circles for profile pictures
    // Left person (the one being slapped)
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(120, 120, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    ctx.font = '12px Arial';
    ctx.fillText('Victim', 120, 180);

    // Right person (the slapper)
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.arc(380, 120, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText('Slapper', 380, 180);

    // Draw a simple slapping action line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(330, 100);
    ctx.lineTo(170, 100);
    ctx.stroke();
    
    // Add some motion lines
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(310, 90);
    ctx.lineTo(190, 90);
    ctx.moveTo(310, 110);
    ctx.lineTo(190, 110);
    ctx.stroke();

    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.fillText('💥 SLAP! 💥', 250, 220);
    
    ctx.font = '10px Arial';
    ctx.fillText('Profile pictures will be placed in the circles', 250, 280);

    // Save the template
    const buffer = canvas.toBuffer('image/png');
    await fs.outputFile('./assets/templates/slap-template.png', buffer);
    console.log('✅ Slap template generated at ./assets/templates/slap-template.png');
    
    return buffer;
}

module.exports = { generateSlapTemplate };

// Generate the template immediately if this file is run directly
if (require.main === module) {
    generateSlapTemplate().catch(console.error);
}