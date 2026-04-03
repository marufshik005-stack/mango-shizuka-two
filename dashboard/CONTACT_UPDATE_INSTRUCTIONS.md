# How to Update Your Contact Information

## Quick Update

To add your Facebook profile and Gmail to the dashboard:

1. Open `dashboard/index.html`
2. Find lines 1317-1318 (around line 1317)
3. Replace the placeholder values:

```javascript
const facebookProfile = 'https://www.facebook.com/your-profile-url'; // UPDATE THIS
const gmailAddress = 'zisan@gmail.com'; // UPDATE THIS
```

**Replace with your actual information:**
- Replace `'https://www.facebook.com/your-profile-url'` with your Facebook profile URL
- Replace `'zisan@gmail.com'` with your actual Gmail address

## Example:
```javascript
const facebookProfile = 'https://www.facebook.com/zisan.khan.12345';
const gmailAddress = 'zisan.khan@gmail.com';
```

## What This Updates:
- Contact section Facebook link
- Contact section Gmail link  
- Footer Facebook link
- Footer Gmail link

## Save and Test:
1. Save the file after making changes
2. Open the dashboard in a browser
3. Check that the Facebook and Gmail links work correctly
4. The console will show "📞 Contact information updated for ZISAN!" when successful

---
**Note:** Your name "ZISAN" and GitHub link are already set up in the dashboard.