// TikTok Full Extension - Content Script
(function() {
    'use strict';

    console.log('TikTok Full Extension: Content script starting...');

    // Prevent multiple instances
    if (window['tiktok-full-extension-v1']) {
        console.log('TikTok Full Extension: Already initialized, skipping...');
        return;
    }
    
    window['tiktok-full-extension-v1'] = true;

    // Store authentication data
    let authData = {
        authenticated: false,
        userId: null,
        username: null,
        pageType: 'Unknown',
        lastChecked: null
    };

    // Download mode state
    let downloadMode = {
        enabled: false,
        options: {
            watermark: true,
            audio: true,
            quality: 'medium'
        }
    };

    // Initialize content script
    initialize();

    function initialize() {
        console.log('TikTok Full Extension: Initializing...');
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener(handleMessage);
        console.log('TikTok Full Extension: Message listener set up');
        
        // Initial authentication check
        checkAuthentication();
        
        // Set up periodic checks
        setInterval(checkAuthentication, 10000);
        
        console.log('TikTok Full Extension: Initialization complete');
    }

    function handleMessage(request, sender, sendResponse) {
        console.log('TikTok Full Extension: Received message:', request);
        
        try {
            switch (request.action) {
                case 'checkAuthentication':
                    const result = checkAuthentication();
                    sendResponse({
                        success: true,
                        ...result
                    });
                    break;
                    
                case 'getPageInfo':
                    const info = getPageInfo();
                    sendResponse({
                        success: true,
                        ...info
                    });
                    break;
                    
                case 'enableDownloadMode':
                    downloadMode.enabled = true;
                    saveSettings();
                    sendResponse({
                        success: true,
                        message: 'Download mode enabled successfully'
                    });
                    break;
                    
                case 'disableDownloadMode':
                    downloadMode.enabled = false;
                    saveSettings();
                    sendResponse({
                        success: true,
                        message: 'Download mode disabled successfully'
                    });
                    break;
                    
                case 'ping':
                    sendResponse({
                        success: true,
                        message: 'Content script is alive and responding',
                        timestamp: Date.now(),
                        url: window.location.href
                    });
                    break;
                    
                default:
                    sendResponse({ 
                        success: false, 
                        error: 'Unknown action: ' + request.action 
                    });
            }
        } catch (error) {
            console.error('TikTok Full Extension: Error handling message:', error);
            sendResponse({ 
                success: false, 
                error: 'Error processing request: ' + error.message 
            });
        }
        
        return true;
    }

    function checkAuthentication() {
        try {
            const newAuthData = detectAuthentication();
            authData = {
                ...newAuthData,
                lastChecked: Date.now()
            };
            return authData;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return {
                authenticated: false,
                userId: null,
                username: null,
                pageType: 'Error',
                lastChecked: Date.now()
            };
        }
    }

    function detectAuthentication() {
        const result = {
            authenticated: false,
            userId: null,
            username: null,
            pageType: detectPageType()
        };

        // Check for authentication cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if ((name === 'tt_chain_token' || name === 'ttwid' || name === 'msToken') && value && value.length > 10) {
                result.authenticated = true;
                break;
            }
        }

        // Check for profile elements
        if (!result.authenticated) {
            const profileElements = document.querySelectorAll('[data-e2e="profile-icon"], [data-e2e="avatar"], .avatar, .profile-icon');
            if (profileElements.length > 0) {
                result.authenticated = true;
            }
        }

        // Check for login buttons (indicates not authenticated)
        const loginButtons = document.querySelectorAll('button, a, div');
        for (let button of loginButtons) {
            const text = button.textContent || button.innerText;
            if (text && (text.includes('Log in') || text.includes('Sign in') || text.includes('Login'))) {
                result.authenticated = false;
                break;
            }
        }

        return result;
    }

    function detectPageType() {
        const path = window.location.pathname;
        
        if (path === '/' || path === '') {
            return 'Home Page';
        } else if (path.includes('/@')) {
            return 'User Profile';
        } else if (path.includes('/video/')) {
            return 'Video Page';
        } else if (path.includes('/foryou')) {
            return 'For You Page';
        } else if (path.includes('/following')) {
            return 'Following Page';
        } else if (path.includes('/trending')) {
            return 'Trending Page';
        } else if (path.includes('/search')) {
            return 'Search Results';
        } else {
            return 'Other TikTok Page';
        }
    }

    function getPageInfo() {
        return {
            ...authData,
            url: window.location.href,
            title: document.title
        };
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['downloadMode']);
            if (result.downloadMode) {
                downloadMode = { ...downloadMode, ...result.downloadMode };
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function saveSettings() {
        try {
            await chrome.storage.local.set({ downloadMode });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // Load settings
    loadSettings();

    // Expose functions for debugging
    window.tikTokExtension = {
        checkAuthentication,
        getPageInfo,
        authData,
        downloadMode
    };

    console.log('TikTok Full Extension: Content script fully initialized and ready');
})();
