# Quick Installation Guide

## Step-by-Step Installation

### 1. Download the Extension
- Download or clone this repository to your computer
- Extract the files if you downloaded a ZIP file

### 2. Open Chrome Extensions
- Open Google Chrome
- Type `chrome://extensions/` in the address bar and press Enter
- Or go to Chrome Menu → More Tools → Extensions

### 3. Enable Developer Mode
- Look for the "Developer mode" toggle in the top right corner
- Click the toggle to turn it ON (it will turn blue)

### 4. Load the Extension
- Click the "Load unpacked" button that appears
- Navigate to the folder containing your extension files
- Select the folder and click "Select Folder"

### 5. Verify Installation
- You should see "TikTok Full Extension" in your extensions list
- The extension icon should appear in your Chrome toolbar
- If you don't see it, click the puzzle piece icon to find it

### 6. Test the Extension
- Go to [tiktok.com](https://www.tiktok.com)
- Click the extension icon in your toolbar
- You should see the popup with authentication status

## Troubleshooting

### Extension Won't Load?
- Make sure all files are in the same folder
- Check that `manifest.json` is in the root folder
- Verify Developer Mode is enabled

### Icon Not Showing?
- Click the puzzle piece icon in the toolbar
- Find "TikTok Full Extension" and click the pin icon
- The extension icon should now appear in your toolbar

### Not Working on TikTok?
- Make sure you're on a TikTok page (tiktok.com)
- Refresh the TikTok page
- Check the extension is enabled in `chrome://extensions/`

## Icon Setup

**Important**: The current icon files are placeholders. You need to:

1. Use the provided `icons/icon.svg` file
2. Convert it to PNG format using an online converter
3. Create these sizes:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)  
   - `icon128.png` (128x128 pixels)
4. Replace the placeholder files in the `icons/` folder

## Need Help?

- Check the main README.md file for detailed information
- Look at the troubleshooting section
- Check the browser console for error messages
- Ensure you're using a recent version of Chrome

---

**Note**: This extension requires Chrome version 88 or later for Manifest V3 support.
