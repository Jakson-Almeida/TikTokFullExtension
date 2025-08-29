# TikTok Full Extension

A Chrome extension designed to work with different tools on TikTok pages, including authentication status checker and video downloader.

## Features

### Current Features
- **Authentication Status Checker**: Detects whether the user is logged into TikTok
- **Video Download Tool**: Download TikTok videos with customizable options
- **Real-time Monitoring**: Continuously monitors authentication status
- **Page Type Detection**: Identifies different types of TikTok pages (Home, Profile, Video, etc.)
- **User Information Display**: Shows user ID and username when authenticated
- **Modern UI**: Clean and responsive popup interface with tabbed navigation
- **Download Buttons**: Automatically injects download buttons into TikTok posts

### Planned Features
- Enhanced video download capabilities
- Content analysis tools
- User analytics
- Enhanced TikTok interactions

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Clone or Download** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top right corner
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Pin the extension** to your toolbar for easy access

### Method 2: Install from Chrome Web Store (Future)

*Coming soon - the extension will be available on the Chrome Web Store*

## Usage

### Authentication Tab
1. **Navigate to TikTok**: Go to any TikTok page (e.g., [tiktok.com](https://www.tiktok.com))
2. **Click the Extension Icon**: Click the TikTok Full Extension icon in your Chrome toolbar
3. **View Status**: The popup will show your authentication status:
   - ✅ **Authenticated**: You are logged into TikTok
   - ❌ **Not Authenticated**: You are not logged in
   - 🔄 **Checking**: The extension is verifying your status
4. **Use Buttons**:
   - **Refresh Status**: Manually check authentication status
   - **Check Current Page**: Get detailed information about the current TikTok page

### Download Tool Tab
1. **Enable Download Mode**: Click "Enable Download Mode" to activate video downloading
2. **Configure Options**:
   - **Include Watermark**: Choose whether to download with or without TikTok watermark
   - **Include Audio**: Choose whether to include audio in the download
3. **Download Videos**: Download buttons (📥) will appear on all TikTok posts
4. **Click Download**: Click the download button on any post to download the video

### Settings Tab
- **Auto-check authentication**: Automatically check authentication status
- **Show download buttons**: Control whether download buttons appear on posts
- **Download quality**: Choose video quality (High, Medium, Low)
- **Save/Reset**: Save your preferences or reset to defaults

## How It Works

### Authentication Detection Methods

The extension uses multiple methods to detect authentication status:

1. **Cookie Analysis**: Checks for TikTok authentication cookies
2. **DOM Inspection**: Looks for user-specific elements on the page
3. **Content Analysis**: Analyzes page content for authentication indicators

### Video Download System

The download functionality works by:

1. **Button Injection**: Automatically adds download buttons to TikTok posts
2. **Video Detection**: Identifies video elements and extracts source URLs
3. **Download Processing**: Handles the download process with user preferences
4. **Status Feedback**: Shows download progress and completion status

### Page Type Detection

The extension automatically detects different TikTok page types:
- Home Page
- User Profile
- Video Page
- For You Page
- Following Page
- Trending Page
- Search Results
- Upload Page
- Inbox
- Settings

## File Structure

```
TikTokFullExtension/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface HTML with tabs
├── popup.css             # Popup styling and animations
├── popup.js              # Popup functionality and tab management
├── content.js            # Content script for TikTok pages and download functionality
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon.svg          # Source SVG icon
│   ├── icon16.png        # 16x16 PNG icon
│   ├── icon48.png        # 48x48 PNG icon
│   └── icon128.png       # 128x128 PNG icon
├── README.md             # This file
└── INSTALLATION.md       # Quick installation guide
```

## Technical Details

### Manifest Version 3
This extension uses Chrome's latest Manifest V3, which provides:
- Better security
- Improved performance
- Service worker-based background scripts

### Permissions
- `activeTab`: Access to the currently active tab
- `storage`: Local storage for extension data and settings
- `downloads`: Permission to download files
- `host_permissions`: Access to TikTok domains

### Content Scripts
The content script runs on all TikTok pages and:
- Monitors page changes
- Detects authentication status
- Injects download buttons
- Handles video downloads
- Communicates with the popup

## Development

### Prerequisites
- Google Chrome browser
- Basic knowledge of HTML, CSS, and JavaScript

### Local Development
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension card
4. Test your changes

### Debugging
- Use Chrome DevTools to inspect the popup
- Check the console for content script logs
- Use the background script console in the extensions page

## Icon Requirements

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

## Troubleshooting

### Common Issues

1. **Extension Not Working on TikTok**
   - Ensure you're on a TikTok page
   - Refresh the page
   - Check if the extension is enabled

2. **Download Buttons Not Appearing**
   - Go to the Download Tool tab
   - Click "Enable Download Mode"
   - Refresh the TikTok page
   - Check if "Show download buttons" is enabled in Settings

3. **Downloads Not Working**
   - Ensure you have download permissions enabled
   - Check browser download settings
   - Some videos may have download restrictions

4. **Authentication Status Not Updating**
   - Click the "Refresh Status" button
   - Wait a few seconds for automatic updates
   - Check browser console for errors

### Error Messages

- **"Not on TikTok"**: You're not currently on a TikTok page
- **"Error occurred"**: There was an issue checking authentication
- **"Download failed"**: Video download could not be completed

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter issues or have questions:
1. Check the troubleshooting section
2. Review the console for error messages
3. Create an issue on GitHub

## Version History

- **v1.0.0**: Initial release with authentication status checker and video downloader

---

**Note**: This extension is designed for educational and personal use. Please respect TikTok's terms of service and use responsibly. Video downloads are subject to TikTok's content policies and may not work for all videos due to technical limitations.
