# TikTok Full Extension

A powerful Chrome extension that enhances TikTok with advanced video downloading, post link copying, and authentication management features. Now with **API-powered direct downloads** and **smart fallback systems**.

## ✨ Features

### 🔐 Authentication & Monitoring
- **Real-time Authentication Detection**: Automatically detects TikTok login status
- **Smart Page Type Recognition**: Identifies Home, Profile, Video, Search, and other TikTok pages
- **User Information Display**: Shows user ID, username, and current page details
- **Auto-refresh**: Continuously monitors authentication status every 5 seconds

### 🎥 Advanced Video Download System
- **Toggle Download Mode**: Single button to enable/disable download functionality
- **Smart Button Injection**: Automatically adds download buttons to all TikTok posts
- **Multiple Video Detection Strategies**: 8 advanced methods to find direct video URLs
- **Direct Video Access**: Opens videos in new tabs for easy downloading
- **Fallback Support**: Multiple fallback methods if direct video URLs aren't available
- **🎯 NEW: API Download Method**: Choose between API-powered direct downloads or browser-based methods
- **🔄 Smart API Fallback**: Multiple working TikTok download APIs with automatic fallback

### 🔗 Post Link Management
- **Copy Post Links**: One-click copying of TikTok post URLs to clipboard
- **Visual Feedback**: Animated confirmation when links are copied
- **Smart Link Detection**: Automatically finds the correct post URL for each video

### 🚀 Auto-Start & Background Operation
- **Auto-start When Authenticated**: Download mode activates automatically for logged-in users
- **Background Operation**: Works without requiring popup interaction
- **Persistent Settings**: Saves preferences in local storage
- **Smart State Management**: Remembers and restores user preferences

### 🎨 Modern User Interface
- **Tabbed Navigation**: Clean, organized interface with Authentication, Download Tool, and Settings tabs
- **Responsive Design**: Optimized for different screen sizes
- **Visual Status Indicators**: Color-coded authentication and download status
- **Intuitive Controls**: Easy-to-use buttons and toggles
- **🎯 Download Method Selector**: Choose your preferred download approach

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Clone or Download** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top right corner
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Pin the extension** to your toolbar for easy access

### Method 2: Install from Chrome Web Store (Future)

*Coming soon - the extension will be available on the Chrome Web Store*

## 📖 Usage Guide

### 🔐 Authentication Tab
1. **Navigate to TikTok**: Go to any TikTok page (e.g., [tiktok.com](https://www.tiktok.com))
2. **Click the Extension Icon**: Click the TikTok Full Extension icon in your Chrome toolbar
3. **View Status**: The popup shows your authentication status:
   - ✅ **Authenticated**: You are logged into TikTok
   - ❌ **Not Authenticated**: You are not logged in
   - 🔄 **Checking**: The extension is verifying your status
4. **Use Buttons**:
   - **Refresh Status**: Manually check authentication status
   - **Check Current Page**: Get detailed information about the current TikTok page

### 🎥 Download Tool Tab
1. **Toggle Download Mode**: 
   - **First Click**: Enables download mode, shows "Download Mode Active" (green)
   - **Second Click**: Disables download mode, shows "Enable Download Mode" (normal)
   - **Continues toggling** between states
2. **Auto-start Control**: Toggle whether download mode activates automatically when authenticated
3. **🎯 Download Method Selection**: Choose between:
   - **API Download (Direct Links)**: Uses external TikTok download APIs for direct video links
   - **Browser Download (New Tab)**: Opens videos in new tabs using browser-based detection
4. **Download Buttons**: Circular ⬇️ buttons appear on all TikTok posts when enabled
5. **Copy Link Buttons**: Circular 🔗 buttons appear next to download buttons for easy link copying

### ⚙️ Settings Tab
- **Auto-check authentication**: Automatically check authentication status
- **Show download buttons**: Control whether download buttons appear on posts
- **Download quality**: Choose video quality (High, Medium, Low)
- **Save/Reset**: Save your preferences or reset to defaults

## 🔧 How It Works

### 🎯 Video Detection Strategies

The extension uses 8 advanced methods to find direct video URLs:

1. **TikTok Internal Data**: Extracts video URLs from `window.__INITIAL_STATE__`
2. **Video Element Sources**: Checks `<video>` element `src` and `currentSrc` attributes
3. **URL Pattern Construction**: Builds direct CDN URLs using TikTok's video ID patterns
4. **Video Link Extraction**: Finds and processes `a[href*="/video/"]` links
5. **Image-to-Video Conversion**: Converts TikTok CDN thumbnail URLs to video URLs
6. **Data Attributes**: Searches for `data-video-id`, `data-video-url`, `data-video-src`
7. **Script Content Parsing**: Extracts video URLs from embedded script tags
8. **Fallback Methods**: Opens TikTok post pages in new tabs if direct video URLs aren't found

### 🚀 NEW: API Download System

The extension now includes a powerful API download system with multiple fallback options:

#### **API Download Method**
- **Multiple API Endpoints**: Tries several working TikTok download APIs
- **Automatic Fallback**: If one API fails, automatically tries the next
- **Direct Download Links**: Provides direct video URLs without watermarks
- **Smart Response Parsing**: Handles different API response formats
- **User Choice**: Download with or without watermark, or cover image

#### **Working APIs Included**
1. **Simple TikTok Downloader**: Basic API for direct video links
2. **TikWM API**: Reliable TikTok download service
3. **TikTok Downloader Service**: RapidAPI-based service for enhanced features

#### **API Response Handling**
- **Multiple Format Support**: Handles various API response structures
- **URL Extraction**: Automatically finds video, watermark, and cover URLs
- **Fallback to Browser**: If all APIs fail, seamlessly switches to browser method
- **User Feedback**: Shows processing status and error messages

### 🔍 Authentication Detection Methods

The extension uses multiple methods to detect authentication status:

1. **Cookie Analysis**: Checks for TikTok authentication cookies (`tt_chain_token`, `ttwid`, `msToken`)
2. **DOM Inspection**: Looks for user-specific elements (profile icons, avatars)
3. **Content Analysis**: Analyzes page content for authentication indicators
4. **Login Button Detection**: Identifies login/signin buttons to determine unauthenticated state

### 🎨 Button Injection System

The download system works through:

1. **Smart Post Detection**: Multiple selector strategies to find TikTok posts
2. **Dynamic Button Injection**: Automatically adds buttons to new content as it loads
3. **Retry Mechanisms**: Multiple injection attempts with different timing strategies
4. **MutationObserver**: Watches for dynamic content changes and re-injects buttons
5. **Alternative Injection**: Fallback methods if standard selectors don't work

## 📁 File Structure

```
TikTokFullExtension/
├── manifest.json          # Extension configuration (Manifest V3)
├── popup.html            # Popup interface HTML with tabbed navigation
├── popup.css             # Modern styling with animations and responsive design
├── popup.js              # Popup functionality, tab management, and toggle logic
├── content.js            # Content script with advanced video detection and button injection
├── background.js         # Background service worker for extension lifecycle
├── icons/                # Extension icons
│   ├── icon.svg          # Source SVG icon
│   ├── icon16.png        # 16x16 PNG icon
│   ├── icon48.png        # 48x48 PNG icon
│   └── icon128.png       # 128x128 PNG icon
├── README.md             # This comprehensive documentation
└── INSTALLATION.md       # Quick installation guide
```

## 🛠️ Technical Details

### Manifest Version 3
This extension uses Chrome's latest Manifest V3, which provides:
- **Enhanced Security**: Better isolation and permission management
- **Improved Performance**: Service worker-based background scripts
- **Modern APIs**: Access to latest Chrome extension capabilities

### Permissions
- `activeTab`: Access to the currently active tab
- `storage`: Local storage for extension data and settings
- `downloads`: Permission to download files
- `host_permissions`: Access to TikTok domains (`https://www.tiktok.com/*`)

### Content Scripts
The content script runs on all TikTok pages and provides:
- **Real-time Monitoring**: Continuous authentication and content monitoring
- **Smart Button Injection**: Intelligent placement of download and copy link buttons
- **Advanced Video Detection**: Multiple strategies to find direct video URLs
- **Dynamic Content Handling**: Responds to TikTok's dynamic content loading
- **Communication Bridge**: Seamless communication between popup and TikTok pages
- **🎯 API Integration**: Seamless integration with external TikTok download APIs

## 🚀 Development

### Prerequisites
- Google Chrome browser (latest version)
- Basic knowledge of HTML, CSS, and JavaScript
- Understanding of Chrome Extension APIs

### Local Development
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes on TikTok pages

### Debugging
- **Popup Debugging**: Use Chrome DevTools to inspect the popup
- **Content Script Logging**: Check the console for detailed video detection logs
- **Background Script**: Use the background script console in the extensions page
- **Console Logs**: Extensive logging for troubleshooting video detection and button injection
- **🎯 API Debugging**: Detailed logs for API calls and responses

## 🎨 Icon Requirements

**Important**: The current icon files are placeholders. You need to:

1. **Convert the SVG**: Use the provided `icon.svg` file
2. **Generate PNGs**: Create the following sizes:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)
3. **Online Tools**: Use services like:
   - [Convertio](https://convertio.co/svg-png/)
   - [CloudConvert](https://cloudconvert.com/svg-to-png)
   - [SVG to PNG](https://svgtopng.com/)

## 🔧 Troubleshooting

### Common Issues

1. **Extension Not Working on TikTok**
   - Ensure you're on a TikTok page
   - Refresh the page
   - Check if the extension is enabled
   - Look for console errors

2. **Download Buttons Not Appearing**
   - Go to the Download Tool tab
   - Click "Enable Download Mode" (button should turn green)
   - Refresh the TikTok page
   - Check console for injection logs

3. **Downloads Not Working**
   - **API Method**: Check console for API call logs and error messages
   - **Browser Method**: The extension opens videos in new tabs for manual downloading
   - Check if popup blockers are interfering
   - Some videos may have download restrictions

4. **Authentication Status Not Updating**
   - Click the "Refresh Status" button
   - Wait a few seconds for automatic updates
   - Check browser console for error messages

5. **🎯 API Download Issues**
   - Check console for API call attempts and responses
   - If APIs fail, the extension automatically falls back to browser method
   - Some TikTok videos may not be accessible via APIs due to restrictions

### Error Messages

- **"Not on TikTok"**: You're not currently on a TikTok page
- **"Error occurred"**: There was an issue checking authentication
- **"Could not establish connection"**: Content script communication issue - refresh the page
- **"API failed, using browser method"**: API calls failed, falling back to browser download
- **"All APIs failed"**: All external APIs are unavailable, using browser method

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on TikTok pages
5. Submit a pull request with detailed description

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Support

If you encounter issues or have questions:
1. Check the troubleshooting section above
2. Review the browser console for detailed error messages
3. Check the extension's console logs for debugging information
4. Create an issue on GitHub with:
   - Browser version
   - Extension version
   - Error messages
   - Steps to reproduce

## 📈 Version History

- **v1.1.0**: 🎯 **NEW API Download System** - Multiple working TikTok download APIs with smart fallback
- **v1.0.2**: Enhanced download method selector and improved API integration
- **v1.0.1**: Enhanced UI, removed watermark/audio options, improved video detection
- **v1.0.0**: Initial release with authentication status checker and basic video downloader

## 🔮 Future Enhancements

- **Enhanced Video Quality Options**: More granular quality control
- **Batch Download Support**: Download multiple videos at once
- **Advanced Content Analysis**: Better video metadata extraction
- **User Analytics Dashboard**: Track download history and preferences
- **Social Features**: Share download links and recommendations
- **🎯 Additional API Providers**: More TikTok download API options
- **Smart API Selection**: Automatic selection of best-performing APIs

---

**Note**: This extension is designed for educational and personal use. Please respect TikTok's terms of service and use responsibly. Video downloads are subject to TikTok's content policies and may not work for all videos due to technical limitations. 

**API Method**: The API download method provides direct video links when available, with automatic fallback to browser-based methods if APIs are unavailable or fail.

**Browser Method**: The browser method opens videos in new tabs for manual downloading to comply with browser security policies.
