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
        autoStart: true, // Auto-start when authenticated
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
        
        // Load saved settings
        loadSettings().then(() => {
            // Initial authentication check
            checkAuthentication();
            
            // Set up periodic checks
            setInterval(checkAuthentication, 10000);
            
            // Check if we should auto-start download mode
            if (downloadMode.autoStart && authData.authenticated && !downloadMode.enabled) {
                console.log('TikTok Full Extension: Auto-start enabled, user authenticated, enabling download mode');
                downloadMode.enabled = true;
                saveSettings();
                injectDownloadButtons();
            }
        });
        
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
                    console.log('TikTok Full Extension: Enabling download mode');
                    downloadMode.enabled = true;
                    saveSettings();
                    injectDownloadButtons();
                    sendResponse({
                        success: true,
                        message: 'Download mode enabled successfully'
                    });
                    break;
                    
                case 'disableDownloadMode':
                    console.log('TikTok Full Extension: Disabling download mode');
                    downloadMode.enabled = false;
                    saveSettings();
                    removeDownloadButtons();
                    sendResponse({
                        success: true,
                        message: 'Download mode disabled successfully'
                    });
                    break;

                case 'toggleAutoStart':
                    console.log('TikTok Full Extension: Toggling auto-start');
                    downloadMode.autoStart = !downloadMode.autoStart;
                    saveSettings();
                    
                    sendResponse({
                        success: true,
                        message: `Auto-start ${downloadMode.autoStart ? 'enabled' : 'disabled'}`,
                        autoStart: downloadMode.autoStart
                    });
                    break;

                case 'getDownloadModeStatus':
                    console.log('TikTok Full Extension: Getting download mode status');
                    sendResponse({
                        success: true,
                        downloadMode: downloadMode
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
            
            // Auto-start download mode if user is authenticated and autoStart is enabled
            if (newAuthData.authenticated && downloadMode.autoStart && !downloadMode.enabled) {
                console.log('TikTok Full Extension: User authenticated, auto-starting download mode');
                downloadMode.enabled = true;
                saveSettings();
                
                // Inject download buttons after a short delay
                setTimeout(() => {
                    injectDownloadButtons();
                    console.log('TikTok Full Extension: Download mode auto-started and buttons injected');
                }, 2000);
            }
            
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

    function injectDownloadButtons() {
        if (!downloadMode.enabled) {
            console.log('TikTok Full Extension: Download mode not enabled, skipping button injection');
            return;
        }

        console.log('TikTok Full Extension: Injecting download buttons...');
        
        // Remove existing buttons first
        removeDownloadButtons();
        
        // Find TikTok posts/videos
        const posts = document.querySelectorAll('[data-e2e="search-card"], [data-e2e="video-feed-item"], .video-feed-item, .search-card');
        
        console.log('TikTok Full Extension: Found', posts.length, 'posts to inject buttons into');
        
        posts.forEach((post, index) => {
            try {
                // Create download button
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'tiktok-download-btn';
                downloadBtn.innerHTML = '⬇️ Download';
                downloadBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #fe2c55;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 8px 12px;
                    font-size: 12px;
                    font-weight: bold;
                    cursor: pointer;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;
                
                // Add click event
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadVideo(post);
                });
                
                // Make post container relative positioned if not already
                if (getComputedStyle(post).position === 'static') {
                    post.style.position = 'relative';
                }
                
                // Add button to post
                post.appendChild(downloadBtn);
                console.log('TikTok Full Extension: Added download button to post', index + 1);
                
            } catch (error) {
                console.error('TikTok Full Extension: Error adding download button to post', index + 1, error);
            }
        });
        
        console.log('TikTok Full Extension: Download button injection complete');
    }

    function removeDownloadButtons() {
        const existingButtons = document.querySelectorAll('.tiktok-download-btn');
        existingButtons.forEach(btn => btn.remove());
        console.log('TikTok Full Extension: Removed', existingButtons.length, 'existing download buttons');
    }

    function downloadVideo(postElement) {
        console.log('TikTok Full Extension: Download video requested for post:', postElement);
        
        try {
            // Try to find video element
            const videoElement = postElement.querySelector('video');
            if (videoElement && videoElement.src) {
                console.log('TikTok Full Extension: Found video source:', videoElement.src);
                
                // Open video in new tab
                window.open(videoElement.src, '_blank');
                return;
            }
            
            // Try to find video link
            const videoLink = postElement.querySelector('a[href*="/video/"]');
            if (videoLink) {
                console.log('TikTok Full Extension: Found video link:', videoLink.href);
                
                // Open TikTok video page in new tab
                window.open(videoLink.href, '_blank');
                return;
            }
            
            // Fallback: open current page in new tab
            console.log('TikTok Full Extension: No direct video found, opening current page in new tab');
            window.open(window.location.href, '_blank');
            
        } catch (error) {
            console.error('TikTok Full Extension: Error downloading video:', error);
            // Fallback: open current page in new tab
            window.open(window.location.href, '_blank');
        }
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['downloadMode']);
            if (result.downloadMode) {
                downloadMode = { ...downloadMode, ...result.downloadMode };
                console.log('TikTok Full Extension: Loaded settings:', downloadMode);
                
                // If download mode was previously enabled, restore it
                if (downloadMode.enabled) {
                    setTimeout(injectDownloadButtons, 2000); // Wait for page to load
                }
            }
            
            // Set default values for new installations
            if (downloadMode.autoStart === undefined) {
                downloadMode.autoStart = true;
            }
            
            console.log('TikTok Full Extension: Final download mode settings:', downloadMode);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async function saveSettings() {
        try {
            await chrome.storage.local.set({ downloadMode });
            console.log('TikTok Full Extension: Settings saved:', downloadMode);
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    // Set up periodic checks for download mode status
    setInterval(() => {
        // If autoStart is enabled and user is authenticated but download mode is disabled,
        // re-enable it automatically
        if (downloadMode.autoStart && authData.authenticated && !downloadMode.enabled) {
            console.log('TikTok Full Extension: Auto-start enabled, user authenticated, but download mode disabled. Re-enabling...');
            downloadMode.enabled = true;
            saveSettings();
            
            // Inject download buttons
            setTimeout(() => {
                injectDownloadButtons();
                console.log('TikTok Full Extension: Download mode auto-re-enabled and buttons injected');
            }, 1000);
        }
    }, 15000);

    // Expose functions for debugging
    window.tikTokExtension = {
        checkAuthentication,
        getPageInfo,
        authData,
        downloadMode,
        injectDownloadButtons,
        removeDownloadButtons
    };

    console.log('TikTok Full Extension: Content script fully initialized and ready');
})();
