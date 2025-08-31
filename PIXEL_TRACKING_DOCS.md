# TikTok Extension Pixel Tracking Documentation

## Overview
This document explains how to implement pixel tracking in the TikTok Full Extension to monitor user actions like video downloads and post link copying.

## What is Pixel Tracking?
Pixel tracking uses a small, invisible image (1x1 pixel) to send data to your website when users perform actions in the extension. It's lightweight, simple, and works across all browsers.

## Required Components

### 1. Website Backend (Your Server)
You need a PHP/Python/Node.js script that:
- Receives GET requests with tracking data
- Logs the data to a database or file
- Returns a 1x1 transparent GIF image

### 2. Extension Integration
The extension will send data via HTTP requests to your tracking endpoint.

## Implementation Steps

### Step 1: Create Tracking Endpoint
Create a file on your website (e.g., `https://yourwebsite.com/track.php`):

```php
<?php
// track.php - Pixel tracking endpoint
header('Content-Type: image/gif');
header('Cache-Control: no-cache, no-store, must-revalidate');

// Get tracking data from URL parameters
$data = [
    'timestamp' => date('Y-m-d H:i:s'),
    'action' => $_GET['action'] ?? 'unknown',
    'method' => $_GET['method'] ?? 'unknown',
    'extension_version' => $_GET['version'] ?? 'unknown',
    'user_agent' => $_GET['ua'] ?? 'unknown',
    'ip' => $_SERVER['REMOTE_ADDR']
];

// Log the data (choose one method)
// Method 1: Log to file
$logEntry = json_encode($data) . "\n";
file_put_contents('extension_logs.txt', $logEntry, FILE_APPEND);

// Method 2: Log to database
// $pdo->prepare("INSERT INTO extension_logs (...) VALUES (...)")->execute($data);

// Return 1x1 transparent GIF
echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
?>
```

### Step 2: Extension Integration
Add this function to your `content.js`:

```javascript
// Pixel tracking function
function sendTrackingPixel(action, method = 'unknown') {
    const trackingUrl = 'https://yourwebsite.com/track.php';
    const params = new URLSearchParams({
        action: action,
        method: method,
        version: '1.0.0', // Your extension version
        ua: navigator.userAgent,
        timestamp: Date.now()
    });
    
    // Create and send pixel
    const img = new Image();
    img.src = `${trackingUrl}?${params.toString()}`;
    
    console.log('TikTok Extension: Tracking pixel sent for action:', action);
}
```

### Step 3: Track User Actions
Call the tracking function when users perform actions:

```javascript
// Track video downloads
function downloadVideo(postElement) {
    // ... existing download logic ...
    
    // Track the action
    if (downloadMode.options && downloadMode.options.method === 'api') {
        sendTrackingPixel('video_download', 'api');
    } else {
        sendTrackingPixel('video_download', 'browser');
    }
}

// Track link copying
function copyPostLink(postElement) {
    // ... existing copy logic ...
    
    // Track the action
    sendTrackingPixel('copy_link', 'clipboard');
}
```

## Data You Can Track

### Actions (`action` parameter):
- `video_download` - User downloaded a video
- `copy_link` - User copied post link
- `cover_download` - User downloaded cover image
- `api_fallback` - API failed, fell back to browser method

### Methods (`method` parameter):
- `api` - Used API download method
- `browser` - Used browser download method
- `clipboard` - Used clipboard for copying

### Additional Data:
- `timestamp` - When action occurred
- `version` - Extension version
- `ua` - User agent string
- `ip` - User's IP address (from server)

## Example Tracking URLs

When a user downloads a video using API method:
```
https://yourwebsite.com/track.php?action=video_download&method=api&version=1.0.0&ua=Mozilla%2F5.0...&timestamp=1703123456789
```

When a user copies a post link:
```
https://yourwebsite.com/track.php?action=copy_link&method=clipboard&version=1.0.0&ua=Mozilla%2F5.0...&timestamp=1703123456789
```

## Database Schema (Optional)

If you want to store data in a database:

```sql
CREATE TABLE extension_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME,
    action VARCHAR(50),
    method VARCHAR(50),
    extension_version VARCHAR(20),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Privacy Considerations

1. **Data Minimization**: Only collect necessary data
2. **User Consent**: Consider adding a privacy notice
3. **Data Retention**: Implement data deletion policies
4. **GDPR Compliance**: If serving EU users, ensure compliance

## Testing

1. **Check Network Tab**: Verify pixel requests appear in browser dev tools
2. **Server Logs**: Confirm your tracking endpoint receives requests
3. **Data Storage**: Verify data is being logged correctly

## Troubleshooting

### Pixel Not Sending:
- Check if tracking URL is correct
- Verify no CORS issues
- Check browser console for errors

### Data Not Logging:
- Verify server permissions for file writing
- Check PHP error logs
- Test endpoint manually in browser

## Next Steps

1. Implement basic pixel tracking
2. Test with real user actions
3. Analyze collected data
4. Consider upgrading to authenticated API calls for richer data

## Support

For questions or issues with pixel tracking implementation, refer to your server logs and browser developer tools for debugging information.
