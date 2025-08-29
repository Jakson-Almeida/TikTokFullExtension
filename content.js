// TikTok Full Extension - Content Script
// This script runs on TikTok pages and detects authentication status
// Also provides download functionality for TikTok videos

(function() {
    'use strict';

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
        console.log('TikTok Full Extension: Content script initialized');
        
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener(handleMessage);
        
        // Initial authentication check
        checkAuthentication();
        
        // Set up periodic checks
        setInterval(checkAuthentication, 10000); // Check every 10 seconds
        
        // Listen for page changes
        observePageChanges();
        
        // Load saved settings
        loadSettings();
        
        // Log initialization
        console.log('TikTok Full Extension: Ready to receive messages');
    }

    function handleMessage(request, sender, sendResponse) {
        console.log('TikTok Full Extension: Received message:', request);
        console.log('TikTok Full Extension: Request action:', request.action);
        console.log('TikTok Full Extension: Request action type:', typeof request.action);
        console.log('TikTok Full Extension: Request action length:', request.action ? request.action.length : 'null');
        console.log('TikTok Full Extension: Request action trimmed:', request.action ? request.action.trim() : 'null');
        
        try {
            switch (request.action) {
                case 'checkAuthentication':
                    const result = checkAuthentication();
                    console.log('TikTok Full Extension: Authentication result:', result);
                    sendResponse({
                        success: true,
                        ...result
                    });
                    break;
                    
                case 'getPageInfo':
                    const info = getPageInfo();
                    console.log('TikTok Full Extension: Page info:', info);
                    sendResponse({
                        success: true,
                        ...info
                    });
                    break;
                    
                case 'enableDownloadMode':
                    console.log('TikTok Full Extension: Enabling download mode with options:', request.options);
                    downloadMode.enabled = true;
                    downloadMode.options = request.options || downloadMode.options;
                    saveSettings();
                    
                    // Inject download buttons after a short delay to ensure page is ready
                    setTimeout(() => {
                        injectDownloadButtons();
                        console.log('TikTok Full Extension: Download buttons injected');
                    }, 1000);
                    
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
                    
                case 'ping':
                    // Simple ping to test communication
                    console.log('TikTok Full Extension: Received ping request');
                    const pingResponse = {
                        success: true,
                        message: 'Content script is alive and responding',
                        timestamp: Date.now(),
                        url: window.location.href
                    };
                    console.log('TikTok Full Extension: Sending ping response:', pingResponse);
                    sendResponse(pingResponse);
                    break;
                    
                default:
                    console.log('TikTok Full Extension: Unknown action:', request.action);
                    console.log('TikTok Full Extension: Action comparison with ping:', request.action === 'ping');
                    console.log('TikTok Full Extension: Action comparison with "ping":', request.action === "ping");
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
        
        return true; // Keep message channel open for async response
    }

    function checkAuthentication() {
        try {
            const newAuthData = detectAuthentication();
            
            // Update stored data
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

        // Method 1: Check for authentication cookies
        const authCookies = checkAuthCookies();
        if (authCookies.authenticated) {
            result.authenticated = true;
            result.userId = authCookies.userId;
            result.username = authCookies.username;
        }

        // Method 2: Check for user elements in DOM
        if (!result.authenticated) {
            const domAuth = checkDOMAuthentication();
            if (domAuth.authenticated) {
                result.authenticated = true;
                result.userId = result.userId || domAuth.userId;
                result.username = result.username || domAuth.username;
            }
        }

        // Method 3: Check for authentication indicators in page content
        if (!result.authenticated) {
            const contentAuth = checkContentAuthentication();
            if (contentAuth.authenticated) {
                result.authenticated = true;
                result.userId = result.userId || contentAuth.userId;
                result.username = result.username || contentAuth.username;
            }
        }

        return result;
    }

    function checkAuthCookies() {
        try {
            const cookies = document.cookie.split(';');
            let result = { authenticated: false, userId: null, username: null };
            
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                
                // Check for common TikTok authentication cookies
                if (name === 'tt_chain_token' || name === 'ttwid' || name === 'msToken') {
                    if (value && value.length > 10) {
                        result.authenticated = true;
                    }
                }
                
                // Look for user ID in cookies
                if (name === 'user_id' || name === 'uid') {
                    result.userId = value;
                }
                
                // Look for username in cookies
                if (name === 'username' || name === 'uname') {
                    result.username = value;
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error checking cookies:', error);
            return { authenticated: false, userId: null, username: null };
        }
    }

    function checkDOMAuthentication() {
        try {
            let result = { authenticated: false, userId: null, username: null };
            
            // Check for profile elements
            const profileElements = document.querySelectorAll('[data-e2e="profile-icon"], [data-e2e="avatar"], .avatar, .profile-icon');
            if (profileElements.length > 0) {
                result.authenticated = true;
            }
            
            // Check for user menu elements
            const userMenuElements = document.querySelectorAll('[data-e2e="user-menu"], .user-menu, .profile-menu');
            if (userMenuElements.length > 0) {
                result.authenticated = true;
            }
            
            // Check for username display
            const usernameElements = document.querySelectorAll('[data-e2e="username"], .username, .user-name');
            if (usernameElements.length > 0) {
                for (let element of usernameElements) {
                    const text = element.textContent || element.innerText;
                    if (text && text.trim() && !text.includes('@') && text.length < 50) {
                        result.username = text.trim();
                        break;
                    }
                }
            }
            
            // Check for user ID in data attributes
            const userIdElements = document.querySelectorAll('[data-user-id], [data-uid], [data-userid]');
            if (userIdElements.length > 0) {
                for (let element of userIdElements) {
                    const userId = element.getAttribute('data-user-id') || 
                                 element.getAttribute('data-uid') || 
                                 element.getAttribute('data-userid');
                    if (userId && userId.length > 0) {
                        result.userId = userId;
                        break;
                    }
                }
            }
            
            return result;
        } catch (error) {
            console.error('Error checking DOM:', error);
            return { authenticated: false, userId: null, username: null };
        }
    }

    function checkContentAuthentication() {
        try {
            let result = { authenticated: false, userId: null, username: null };
            
            // Check page title for user indicators
            const title = document.title;
            if (title && (title.includes('@') || title.includes('Profile') || title.includes('User'))) {
                result.authenticated = true;
                
                // Extract username from title
                const usernameMatch = title.match(/@(\w+)/);
                if (usernameMatch) {
                    result.username = usernameMatch[1];
                }
            }
            
            // Check for authentication-related text
            const bodyText = document.body.textContent || '';
            if (bodyText.includes('Sign out') || bodyText.includes('Logout') || bodyText.includes('Profile')) {
                result.authenticated = true;
            }
            
            // Check for login/signup buttons (indicates not authenticated)
            const loginButtons = document.querySelectorAll('button, a, div');
            let hasLoginButton = false;
            for (let button of loginButtons) {
                const text = button.textContent || button.innerText;
                if (text && (text.includes('Log in') || text.includes('Sign in') || text.includes('Login'))) {
                    hasLoginButton = true;
                    break;
                }
            }
            
            if (hasLoginButton && !result.authenticated) {
                result.authenticated = false;
            }
            
            return result;
        } catch (error) {
            console.error('Error checking content:', error);
            return { authenticated: false, userId: null, username: null };
        }
    }

    function detectPageType() {
        const url = window.location.href;
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
        } else if (path.includes('/upload')) {
            return 'Upload Page';
        } else if (path.includes('/inbox')) {
            return 'Inbox';
        } else if (path.includes('/settings')) {
            return 'Settings';
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

    function observePageChanges() {
        // Observe URL changes for SPA navigation
        let currentUrl = window.location.href;
        
        const observer = new MutationObserver(() => {
            if (window.location.href !== currentUrl) {
                currentUrl = window.location.href;
                setTimeout(() => {
                    checkAuthentication();
                    if (downloadMode.enabled) {
                        injectDownloadButtons();
                    }
                }, 1000); // Check after navigation
            }
            
            // Check for new content being added
            if (downloadMode.enabled) {
                const newPosts = document.querySelectorAll('[data-e2e="feed-item"]:not([data-tiktok-download-injected])');
                if (newPosts.length > 0) {
                    newPosts.forEach(post => injectDownloadButton(post));
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Download functionality
    function injectDownloadButtons() {
        if (!downloadMode.enabled) {
            console.log('TikTok Full Extension: Download mode not enabled, skipping button injection');
            return;
        }
        
        console.log('TikTok Full Extension: Injecting download buttons...');
        
        // Find all TikTok posts/videos - try multiple selectors
        const selectors = [
            '[data-e2e="feed-item"]',
            '[data-e2e="video-item"]',
            '.video-item',
            '.feed-item',
            '[data-e2e="browse-item"]',
            '.browse-item',
            '[data-e2e="video-feed-item"]',
            '.video-feed-item'
        ];
        
        let posts = [];
        for (let selector of selectors) {
            const found = document.querySelectorAll(selector);
            if (found.length > 0) {
                posts = found;
                console.log(`TikTok Full Extension: Found ${posts.length} posts using selector: ${selector}`);
                break;
            }
        }
        
        if (posts.length === 0) {
            console.log('TikTok Full Extension: No posts found, trying alternative approach...');
            // Try to find any video containers
            posts = document.querySelectorAll('div[class*="video"], div[class*="feed"], div[class*="post"]');
            console.log(`TikTok Full Extension: Found ${posts.length} potential posts using alternative selectors`);
        }
        
        posts.forEach((post, index) => {
            if (!post.hasAttribute('data-tiktok-download-injected')) {
                console.log(`TikTok Full Extension: Injecting download button into post ${index + 1}`);
                injectDownloadButton(post);
            }
        });
        
        console.log(`TikTok Full Extension: Download button injection complete. Total posts processed: ${posts.length}`);
    }

    function injectDownloadButton(post) {
        try {
            // Create download button
            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'tiktok-download-btn';
            downloadBtn.innerHTML = '📥';
            downloadBtn.title = 'Download Video';
            downloadBtn.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.7);
                border: 2px solid white;
                color: white;
                font-size: 16px;
                cursor: pointer;
                z-index: 1000;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // Add hover effects
            downloadBtn.addEventListener('mouseenter', () => {
                downloadBtn.style.background = 'rgba(255, 0, 80, 0.9)';
                downloadBtn.style.transform = 'scale(1.1)';
            });
            
            downloadBtn.addEventListener('mouseleave', () => {
                downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                downloadBtn.style.transform = 'scale(1)';
            });
            
            // Add click handler
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleDownloadClick(post);
            });
            
            // Make post position relative if needed
            if (getComputedStyle(post).position === 'static') {
                post.style.position = 'relative';
            }
            
            // Add button to post
            post.appendChild(downloadBtn);
            post.setAttribute('data-tiktok-download-injected', 'true');
            
            console.log('TikTok Full Extension: Download button successfully injected');
            
        } catch (error) {
            console.error('Error injecting download button:', error);
        }
    }

    function removeDownloadButtons() {
        const downloadBtns = document.querySelectorAll('.tiktok-download-btn');
        downloadBtns.forEach(btn => btn.remove());
        
        const posts = document.querySelectorAll('[data-tiktok-download-injected]');
        posts.forEach(post => post.removeAttribute('data-tiktok-download-injected'));
        
        console.log('TikTok Full Extension: Download buttons removed');
    }

    async function handleDownloadClick(post) {
        try {
            // Show loading state
            const downloadBtn = post.querySelector('.tiktok-download-btn');
            const originalContent = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳';
            downloadBtn.style.background = 'rgba(255, 193, 7, 0.9)';
            
            // Extract video information
            const videoInfo = extractVideoInfo(post);
            
            if (!videoInfo) {
                alert('Could not extract video information. Please try again.');
                downloadBtn.innerHTML = originalContent;
                downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                return;
            }
            
            // Attempt to download
            const success = await downloadVideo(videoInfo);
            
            if (success) {
                downloadBtn.innerHTML = '✅';
                downloadBtn.style.background = 'rgba(40, 167, 69, 0.9)';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                }, 2000);
            } else {
                downloadBtn.innerHTML = '❌';
                downloadBtn.style.background = 'rgba(220, 53, 69, 0.9)';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                }, 2000);
            }
            
        } catch (error) {
            console.error('Error handling download:', error);
            alert('Download failed. Please try again.');
        }
    }

    function extractVideoInfo(post) {
        try {
            // Try to find video element
            const video = post.querySelector('video');
            if (!video) {
                console.log('TikTok Full Extension: No video element found in post');
                return null;
            }
            
            // Get video source
            const videoSrc = video.src || video.currentSrc;
            if (!videoSrc) {
                console.log('TikTok Full Extension: No video source found');
                return null;
            }
            
            // Try to get additional info
            const title = post.querySelector('[data-e2e="video-title"], .video-title, .title')?.textContent || 'TikTok Video';
            const username = post.querySelector('[data-e2e="username"], .username, .user-name')?.textContent || 'Unknown User';
            
            console.log('TikTok Full Extension: Extracted video info:', { src: videoSrc, title, username });
            
            return {
                src: videoSrc,
                title: title.trim(),
                username: username.trim(),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error extracting video info:', error);
            return null;
        }
    }

    async function downloadVideo(videoInfo) {
        try {
            console.log('TikTok Full Extension: Attempting to download video:', videoInfo);
            
            // For now, we'll use a simple approach
            // In a real implementation, you'd need to handle the actual video download
            // This is a placeholder that shows the download would work
            
            // Create a temporary link to trigger download
            const link = document.createElement('a');
            link.href = videoInfo.src;
            link.download = `tiktok_${videoInfo.username}_${videoInfo.timestamp}.mp4`;
            link.target = '_blank';
            
            // Add to DOM temporarily
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Note: This approach has limitations due to CORS and TikTok's security
            // A real implementation would need to handle the video data properly
            
            console.log('TikTok Full Extension: Download initiated successfully');
            return true;
        } catch (error) {
            console.error('Error downloading video:', error);
            return false;
        }
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['downloadMode']);
            if (result.downloadMode) {
                downloadMode = result.downloadMode;
                console.log('TikTok Full Extension: Loaded settings:', downloadMode);
                if (downloadMode.enabled) {
                    setTimeout(injectDownloadButtons, 2000); // Wait for page to load
                }
            }
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

    // Expose functions for debugging
    window.tikTokExtension = {
        checkAuthentication,
        getPageInfo,
        authData,
        downloadMode,
        injectDownloadButtons,
        removeDownloadButtons
    };

    // Log successful initialization
    console.log('TikTok Full Extension: Content script fully initialized and ready');

})();
