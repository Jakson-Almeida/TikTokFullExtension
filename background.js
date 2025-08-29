// TikTok Full Extension - Background Service Worker
// This script runs in the background and handles extension lifecycle

chrome.runtime.onInstalled.addListener(() => {
    console.log('TikTok Full Extension installed successfully');
    
    // Set default extension state
    chrome.storage.local.set({
        extensionEnabled: true,
        lastCheck: Date.now(),
        version: '1.0.0'
    });
});

chrome.runtime.onStartup.addListener(() => {
    console.log('TikTok Full Extension started');
    
    // Update last check time
    chrome.storage.local.set({
        lastCheck: Date.now()
    });
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will only trigger if no popup is defined
    // Since we have a popup, this won't be called
    console.log('Extension icon clicked on tab:', tab.id);
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background script received message:', request);
    
    switch (request.action) {
        case 'getExtensionStatus':
            chrome.storage.local.get(['extensionEnabled', 'lastCheck', 'version'], (result) => {
                sendResponse({
                    success: true,
                    data: result
                });
            });
            break;
            
        case 'updateExtensionStatus':
            chrome.storage.local.set({
                extensionEnabled: request.enabled,
                lastCheck: Date.now()
            }, () => {
                sendResponse({
                    success: true,
                    message: 'Status updated successfully'
                });
            });
            break;
            
        case 'getTabInfo':
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    sendResponse({
                        success: true,
                        data: {
                            url: tabs[0].url,
                            title: tabs[0].title,
                            id: tabs[0].id
                        }
                    });
                } else {
                    sendResponse({
                        success: false,
                        error: 'No active tab found'
                    });
                }
            });
            break;
            
        default:
            sendResponse({
                success: false,
                error: 'Unknown action'
            });
    }
    
    return true; // Keep message channel open for async response
});

// Handle tab updates to check if TikTok pages are loaded
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('tiktok.com')) {
        console.log('TikTok page loaded:', tab.url);
        
        // Update last check time
        chrome.storage.local.set({
            lastCheck: Date.now()
        });
        
        // Note: Content script is automatically injected via manifest.json
        // No need to manually inject it here
    }
});

// Handle tab activation to update extension state
chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.url.includes('tiktok.com')) {
            console.log('TikTok tab activated:', tab.url);
            
            // Update extension icon state if needed
            chrome.action.setBadgeText({
                text: '',
                tabId: tab.id
            });
        }
    });
});

// Handle extension updates
chrome.runtime.onUpdateAvailable.addListener(() => {
    console.log('Extension update available');
    
    // Reload extension to apply update
    chrome.runtime.reload();
});

// Periodic cleanup and maintenance
setInterval(() => {
    chrome.storage.local.get(['lastCheck'], (result) => {
        const now = Date.now();
        const lastCheck = result.lastCheck || 0;
        
        // Clean up old data if needed
        if (now - lastCheck > 24 * 60 * 60 * 1000) { // 24 hours
            chrome.storage.local.remove(['lastCheck']);
        }
    });
}, 60 * 60 * 1000); // Check every hour
