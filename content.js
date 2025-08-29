// TikTok Full Extension - Content Script
// This script runs on TikTok pages and detects authentication status
// Also provides download functionality for TikTok videos

(function() {
    'use strict';

    // Prevent multiple instances
    const SCRIPT_ID = 'tiktok-full-extension-v1';
    if (window[SCRIPT_ID]) {
        console.log('TikTok Full Extension: Already initialized, skipping...');
        return;
    }
    
    window[SCRIPT_ID] = true;
    console.log('TikTok Full Extension: Starting initialization...');

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
        console.log('=== CONTENT SCRIPT INITIALIZATION START ===');
        console.log('TikTok Full Extension: Content script initialized');
        console.log('Current URL:', window.location.href);
        console.log('Document ready state:', document.readyState);
        console.log('Window loaded:', window.loaded);
        
        // Listen for messages from popup
        console.log('Setting up message listener...');
        chrome.runtime.onMessage.addListener(handleMessage);
        console.log('Message listener set up successfully');
        
        // Initial authentication check
        console.log('Performing initial authentication check...');
        checkAuthentication();
        
        // Set up periodic checks
        console.log('Setting up periodic authentication checks...');
        setInterval(checkAuthentication, 10000); // Check every 10 seconds
        
        // Listen for page changes
        console.log('Setting up page change observer...');
        observePageChanges();
        
        // Load saved settings
        console.log('Loading saved settings...');
        loadSettings();
        
        // Log initialization
        console.log('TikTok Full Extension: Ready to receive messages');
        console.log('=== CONTENT SCRIPT INITIALIZATION END ===');
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
                    console.log('TikTok Full Extension: Processing getPageInfo');
                    const info = getPageInfo();
                    console.log('TikTok Full Extension: Page info:', info);
                    sendResponse({
                        success: true,
                        ...info
                    });
                    break;
                    
                case 'enableDownloadMode':
                    console.log('TikTok Full Extension: Processing enableDownloadMode');
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
                    console.log('TikTok Full Extension: Processing disableDownloadMode');
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
                    
                case 'test':
                    // Test case for debugging
                    console.log('TikTok Full Extension: Received test request');
                    sendResponse({
                        success: true,
                        message: 'Test successful - content script is working',
                        timestamp: Date.now(),
                        scriptId: window['tiktok-full-extension-v1']
                    });
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
        console.log('🔍 === INJECT DOWNLOAD BUTTONS DEBUG START ===');
        
        if (!downloadMode.enabled) {
            console.log('🔍 TikTok Full Extension: Download mode not enabled, skipping button injection');
            return;
        }
        
        console.log('🔍 TikTok Full Extension: Injecting download buttons...');
        console.log('🔍 Current URL:', window.location.href);
        console.log('🔍 Document ready state:', document.readyState);
        
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
        
        console.log('🔍 Trying selectors:', selectors);
        
        let posts = [];
        for (let selector of selectors) {
            const found = document.querySelectorAll(selector);
            console.log(`🔍 Selector "${selector}" found ${found.length} elements`);
            if (found.length > 0) {
                posts = found;
                console.log(`🔍 TikTok Full Extension: Found ${posts.length} posts using selector: ${selector}`);
                break;
            }
        }
        
        if (posts.length === 0) {
            console.log('🔍 No posts found, trying alternative approach...');
            // Try to find any video containers
            posts = document.querySelectorAll('div[class*="video"], div[class*="feed"], div[class*="post"]');
            console.log(`🔍 TikTok Full Extension: Found ${posts.length} potential posts using alternative selectors`);
            
            // If still no posts, try more generic selectors
            if (posts.length === 0) {
                console.log('🔍 Trying more generic selectors...');
                const genericSelectors = [
                    'div[class*="DivItemContainer"]',
                    'div[class*="DivVideoFeedV2"]',
                    'div[class*="DivItemContainerV2"]',
                    'div[class*="DivSearchItemContainer"]',
                    'div[class*="DivSearchVideoItem"]'
                ];
                
                for (let selector of genericSelectors) {
                    const found = document.querySelectorAll(selector);
                    console.log(`🔍 Generic selector "${selector}" found ${found.length} elements`);
                    if (found.length > 0) {
                        posts = found;
                        console.log(`🔍 TikTok Full Extension: Found ${posts.length} posts using generic selector: ${selector}`);
                        break;
                    }
                }
            }
        }
        
        console.log(`🔍 Total posts found: ${posts.length}`);
        
        if (posts.length > 0) {
            console.log('🔍 First post element:', posts[0]);
            console.log('🔍 First post classes:', posts[0].className);
            console.log('🔍 First post attributes:', Array.from(posts[0].attributes).map(attr => `${attr.name}="${attr.value}"`));
        }
        
        posts.forEach((post, index) => {
            if (!post.hasAttribute('data-tiktok-download-injected')) {
                console.log(`🔍 TikTok Full Extension: Injecting download button into post ${index + 1}`);
                injectDownloadButton(post);
            } else {
                console.log(`🔍 Post ${index + 1} already has download button`);
            }
        });
        
        console.log(`🔍 Download button injection complete. Total posts processed: ${posts.length}`);
        console.log('🔍 === INJECT DOWNLOAD BUTTONS DEBUG END ===');
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

    function constructVideoUrlFromId(videoId) {
        console.log('Constructing video URL from ID:', videoId);
        
        if (!videoId) {
            console.log('No video ID provided');
            return null;
        }

        // Known TikTok CDN patterns and regions
        const cdnPatterns = [
            // Maliva region (working pattern from example)
            `https://v16-webapp-prime.tiktok.com/video/tos/maliva/tos-maliva-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/maliva/tos-maliva-ve-0068c799-us/${videoId}/`,
            
            // Useast regions
            `https://v16-webapp-prime.tiktok.com/video/tos/useast1/tos-useast1-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/useast1/tos-useast1-ve-0068c799-us/${videoId}/`,
            
            // Useast5 region (from example)
            `https://v16-webapp-prime.tiktok.com/video/tos/useast5/tos-useast5-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/useast5/tos-useast5-ve-0068c799-us/${videoId}/`,
            
            // Uswest regions
            `https://v16-webapp-prime.tiktok.com/video/tos/uswest1/tos-uswest1-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/uswest1/tos-uswest1-ve-0068c799-us/${videoId}/`,
            
            // Europe regions
            `https://v16-webapp-prime.tiktok.com/video/tos/europe/tos-europe-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/europe/tos-europe-ve-0068c799-us/${videoId}/`,
            
            // Asia regions
            `https://v16-webapp-prime.tiktok.com/video/tos/asia/tos-asia-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/asia/tos-asia-ve-0068c799-us/${videoId}/`,
            
            // Global regions
            `https://v16-webapp-prime.tiktok.com/video/tos/global/tos-global-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/global/tos-global-ve-0068c799-us/${videoId}/`,
            
            // Alternative patterns
            `https://v16-webapp-prime.tiktok.com/video/tos/any/tos-any-ve-0068c799-us/${videoId}/`,
            `https://v19-webapp-prime.tiktok.com/video/tos/any/tos-any-ve-0068c799-us/${videoId}/`,
            
            // Direct API URLs
            `https://www.tiktok.com/aweme/v1/play/?item_id=${videoId}&line=0&ply_type=2`,
            `https://www.tiktok.com/api/item/detail/?itemId=${videoId}`,
            
            // Legacy patterns
            `https://v16-webapp.tiktok.com/video/${videoId}/`,
            `https://v19-webapp.tiktok.com/video/${videoId}/`
        ];

        console.log('Testing', cdnPatterns.length, 'CDN patterns...');

        // For now, return the first maliva pattern as it seems to work
        // In the future, we could test each pattern to find the best one
        return `https://v16-webapp-prime.tiktok.com/video/tos/maliva/tos-maliva-ve-0068c799-us/${videoId}/`;
    }

    async function handleDownloadClick(post) {
        try {
            console.log('🔍 === DOWNLOAD CLICK DEBUG START ===');
            console.log('🔍 Post element:', post);
            console.log('🔍 Post classes:', post.className);
            console.log('🔍 Post attributes:', Array.from(post.attributes).map(attr => `${attr.name}="${attr.value}"`));
            
            // Show loading state
            const downloadBtn = post.querySelector('.tiktok-download-btn');
            const originalContent = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '⏳';
            downloadBtn.style.background = 'rgba(255, 193, 7, 0.9)';
            
            // Extract video information with multiple methods
            const videoInfo = await extractVideoInfoAdvanced(post);
            
            if (!videoInfo) {
                console.error('🔍 Failed to extract video information');
                downloadBtn.innerHTML = '❌';
                downloadBtn.style.background = 'rgba(220, 53, 69, 0.9)';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                }, 2000);
                
                // Show better error message
                showDownloadError('Could not extract video information. Please try again.');
                return;
            }
            
            console.log('🔍 Video info extracted successfully:', videoInfo);
            
            // Attempt to download with multiple methods
            const downloadResult = await downloadVideoAdvanced(videoInfo, post);
            
            if (downloadResult.success) {
                console.log('🔍 Download successful:', downloadResult);
                downloadBtn.innerHTML = '✅';
                downloadBtn.style.background = 'rgba(40, 167, 69, 0.9)';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                }, 2000);
                
                // Show success message
                showDownloadSuccess('Download initiated successfully!');
            } else {
                console.error('🔍 Download failed:', downloadResult.error);
                downloadBtn.innerHTML = '❌';
                downloadBtn.style.background = 'rgba(220, 53, 69, 0.9)';
                setTimeout(() => {
                    downloadBtn.innerHTML = originalContent;
                    downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
                }, 2000);
                
                // Show error message
                showDownloadError(`Download failed: ${downloadResult.error}`);
            }
            
            console.log('🔍 === DOWNLOAD CLICK DEBUG END ===');
            
        } catch (error) {
            console.error('🔍 Error handling download:', error);
            const downloadBtn = post.querySelector('.tiktok-download-btn');
            const originalContent = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '❌';
            downloadBtn.style.background = 'rgba(220, 53, 69, 0.9)';
            setTimeout(() => {
                downloadBtn.innerHTML = originalContent;
                downloadBtn.style.background = 'rgba(0, 0, 0, 0.7)';
            }, 2000);
            
            showDownloadError('Download failed. Please try again.');
        }
    }

    async function extractVideoInfoAdvanced(postElement) {
        console.log('=== EXTRACTING VIDEO INFO ADVANCED ===');
        console.log('Post element:', postElement);
        
        let videoSrc = null;
        let videoTitle = '';
        let username = '';
        let videoId = '';

        // Method 1: Try to get from video element with source tags (most reliable)
        const videoElement = postElement.querySelector('video');
        if (videoElement) {
            console.log('Method 1: Found video element with sources');
            const sources = videoElement.querySelectorAll('source');
            if (sources.length > 0) {
                // Try to find the best quality source
                for (let source of sources) {
                    const src = source.src;
                    if (src && !src.startsWith('blob:') && src.includes('tiktok.com')) {
                        console.log('Method 1: Found valid source:', src);
                        videoSrc = src;
                        break;
                    }
                }
            }
            
            // Also check video element's src attribute
            if (!videoSrc && videoElement.src && !videoElement.src.startsWith('blob:')) {
                console.log('Method 1: Found video src attribute:', videoElement.src);
                videoSrc = videoElement.src;
            }
        }

        // Method 2: Look for video URLs in data attributes of the post container
        if (!videoSrc) {
            console.log('Method 2: Checking post container data attributes');
            const container = postElement.closest('[data-e2e*="item"], [id*="container"], [class*="container"]');
            if (container) {
                const dataVideo = container.getAttribute('data-video-url') || 
                                 container.getAttribute('data-video-src') ||
                                 container.getAttribute('data-src') ||
                                 container.getAttribute('data-href');
                if (dataVideo && !dataVideo.startsWith('blob:')) {
                    console.log('Method 2: Found video URL in container data:', dataVideo);
                    videoSrc = dataVideo;
                }
            }
        }

        // Method 3: Extract from post link href and construct video URL
        if (!videoSrc) {
            console.log('Method 3: Extracting from post link href');
            const postLink = postElement.querySelector('a[href*="/video/"]');
            if (postLink) {
                const href = postLink.href;
                console.log('Method 3: Found post link:', href);
                
                // Extract video ID from href
                const videoIdMatch = href.match(/\/video\/(\d+)/);
                if (videoIdMatch) {
                    videoId = videoIdMatch[1];
                    console.log('Method 3: Extracted video ID:', videoId);
                    
                    // Try to construct direct video URL using known patterns
                    const videoUrl = constructVideoUrlFromId(videoId);
                    if (videoUrl) {
                        console.log('Method 3: Constructed video URL:', videoUrl);
                        videoSrc = videoUrl;
                    }
                }
            }
        }

        // Method 4: Look for video URLs in the post's HTML content using regex
        if (!videoSrc) {
            console.log('Method 4: Searching HTML content for video URLs');
            const postHTML = postElement.innerHTML;
            const videoUrlMatch = postHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
            if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                console.log('Method 4: Found video URL in HTML:', videoUrlMatch[0]);
                videoSrc = videoUrlMatch[0];
            }
        }

        // Method 5: Look for video URLs in parent elements (up to 3 levels up)
        if (!videoSrc) {
            console.log('Method 5: Checking parent elements for video URLs');
            let parent = postElement.parentElement;
            let level = 0;
            while (parent && level < 3) {
                const parentHTML = parent.innerHTML;
                const videoUrlMatch = parentHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                    console.log('Method 5: Found video URL in parent level', level, ':', videoUrlMatch[0]);
                    videoSrc = videoUrlMatch[0];
                    break;
                }
                parent = parent.parentElement;
                level++;
            }
        }

        // Method 6: Look for video URLs in the entire page HTML (fallback)
        if (!videoSrc) {
            console.log('Method 6: Searching entire page for video URLs');
            const pageHTML = document.documentElement.innerHTML;
            const videoUrlMatches = pageHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/g);
            if (videoUrlMatches) {
                // Filter out blob URLs and find the first valid one
                for (let url of videoUrlMatches) {
                    if (!url.startsWith('blob:') && url.includes('/video/')) {
                        console.log('Method 6: Found video URL in page:', url);
                        videoSrc = url;
                        break;
                    }
                }
            }
        }

        // Method 7: Try to extract from TikTok's internal data structures
        if (!videoSrc) {
            console.log('Method 7: Checking TikTok internal data structures');
            try {
                // Look for any script tags that might contain video data
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    if (script.textContent && script.textContent.includes('video')) {
                        const videoUrlMatch = script.textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                        if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                            console.log('Method 7: Found video URL in script:', videoUrlMatch[0]);
                            videoSrc = videoUrlMatch[0];
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('Method 7: Error checking scripts:', error);
            }
        }

        // Method 8: Try to find video URLs in iframe sources
        if (!videoSrc) {
            console.log('Method 8: Checking iframe sources');
            const iframes = document.querySelectorAll('iframe');
            for (let iframe of iframes) {
                if (iframe.src && iframe.src.includes('tiktok.com') && iframe.src.includes('video')) {
                    console.log('Method 8: Found video URL in iframe:', iframe.src);
                    videoSrc = iframe.src;
                    break;
                }
            }
        }

        // Method 9: Look for video URLs in meta tags
        if (!videoSrc) {
            console.log('Method 9: Checking meta tags');
            const metaTags = document.querySelectorAll('meta[property*="video"], meta[name*="video"]');
            for (let meta of metaTags) {
                const content = meta.content || meta.getAttribute('content');
                if (content && content.includes('tiktok.com') && content.includes('video')) {
                    console.log('Method 9: Found video URL in meta tag:', content);
                    videoSrc = content;
                    break;
                }
            }
        }

        // Method 10: Try to extract from TikTok's video player data
        if (!videoSrc) {
            console.log('Method 10: Checking TikTok video player data');
            const videoPlayers = postElement.querySelectorAll('[class*="video-player"], [class*="xgplayer"], [id*="xgwrapper"]');
            for (let player of videoPlayers) {
                const playerHTML = player.innerHTML;
                const videoUrlMatch = playerHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                    console.log('Method 10: Found video URL in player:', videoUrlMatch[0]);
                    videoSrc = videoUrlMatch[0];
                    break;
                }
            }
        }

        // Method 11: Look for video URLs in data attributes of video-related elements
        if (!videoSrc) {
            console.log('Method 11: Checking video-related data attributes');
            const videoElements = postElement.querySelectorAll('[data-video-url], [data-video-src], [data-src], [data-href]');
            for (let element of videoElements) {
                const dataVideo = element.getAttribute('data-video-url') || 
                                 element.getAttribute('data-video-src') ||
                                 element.getAttribute('data-src') ||
                                 element.getAttribute('data-href');
                if (dataVideo && dataVideo.includes('tiktok.com') && !dataVideo.startsWith('blob:')) {
                    console.log('Method 11: Found video URL in data attribute:', dataVideo);
                    videoSrc = dataVideo;
                    break;
                }
            }
        }

        // Method 12: Try to find video URLs in the post's text content
        if (!videoSrc) {
            console.log('Method 12: Searching post text content for video URLs');
            const textContent = postElement.textContent || '';
            const videoUrlMatch = textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
            if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                console.log('Method 12: Found video URL in text content:', videoUrlMatch[0]);
                videoSrc = videoUrlMatch[0];
            }
        }

        // Method 13: Try to construct video URL using extracted video ID and known patterns
        if (!videoSrc && videoId) {
            console.log('Method 13: Constructing video URL from ID:', videoId);
            const constructedUrl = constructVideoUrlFromId(videoId);
            if (constructedUrl) {
                console.log('Method 13: Successfully constructed URL:', constructedUrl);
                videoSrc = constructedUrl;
            }
        }

        // Method 14: Final fallback - search for any TikTok video URL in the entire page
        if (!videoSrc) {
            console.log('Method 14: Final fallback - searching entire page');
            const pageHTML = document.documentElement.innerHTML;
            const allVideoUrls = pageHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/g);
            if (allVideoUrls) {
                // Filter out blob URLs and find the first valid one
                for (let url of allVideoUrls) {
                    if (!url.startsWith('blob:') && url.includes('/video/')) {
                        console.log('Method 14: Found fallback video URL:', url);
                        videoSrc = url;
                        break;
                    }
                }
            }
        }

        // Final validation - ensure we don't have a blob URL
        if (videoSrc && videoSrc.startsWith('blob:')) {
            console.log('WARNING: Found blob URL, resetting to null');
            videoSrc = null;
        }

        // Extract additional information
        videoTitle = extractVideoTitle(postElement);
        username = extractVideoUsername(postElement);
        
        if (!videoId) {
            videoId = extractVideoId(postElement);
        }

        console.log('=== EXTRACTION RESULTS ===');
        console.log('Video Source:', videoSrc);
        console.log('Video Title:', videoTitle);
        console.log('Username:', username);
        console.log('Video ID:', videoId);

        return {
            src: videoSrc,
            title: videoTitle,
            username: username,
            videoId: videoId
        };
    }

    function extractVideoTitle(post) {
        const selectors = [
            '[data-e2e="video-title"]',
            '.video-title',
            '.title',
            '[data-e2e="browse-item-title"]',
            '[class*="title"]',
            'h3',
            'h4'
        ];
        
        for (let selector of selectors) {
            const element = post.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        return null;
    }

    function extractVideoUsername(post) {
        const selectors = [
            '[data-e2e="username"]',
            '.username',
            '.user-name',
            '[data-e2e="browse-item-user"]',
            '[class*="username"]',
            '[class*="user"]',
            'a[href*="/@"]'
        ];
        
        for (let selector of selectors) {
            const element = post.querySelector(selector);
            if (element && element.textContent.trim()) {
                return element.textContent.trim();
            }
        }
        
        return null;
    }

    function extractVideoId(post) {
        console.log('🔍 === EXTRACT VIDEO ID DEBUG START ===');
        
        // Method 1: Try to extract video ID from various sources
        const videoIdSelectors = [
            '[data-e2e="video-item"]',
            '[data-video-id]',
            '[data-id]'
        ];
        
        for (let selector of videoIdSelectors) {
            const element = post.querySelector(selector);
            if (element) {
                const id = element.dataset.videoId || element.dataset.id || element.getAttribute('data-video-id') || element.getAttribute('data-id');
                if (id) {
                    console.log(`🔍 Video ID found from selector ${selector}:`, id);
                    return id;
                }
            }
        }
        
        // Method 2: Try to get from post container attributes
        const postIdAttrs = ['data-video-id', 'data-id', 'data-item-id'];
        for (let attr of postIdAttrs) {
            if (post.hasAttribute(attr)) {
                const id = post.getAttribute(attr);
                console.log(`🔍 Video ID found from post ${attr}:`, id);
                return id;
            }
        }
        
        // Method 3: Try to extract from post URL or href
        const postLinks = post.querySelectorAll('a[href*="/video/"], a[href*="/@"]');
        for (let link of postLinks) {
            const href = link.href;
            if (href) {
                // Extract video ID from URL patterns like /video/1234567890/
                const videoIdMatch = href.match(/\/video\/(\d+)/);
                if (videoIdMatch) {
                    const id = videoIdMatch[1];
                    console.log(`🔍 Video ID found from link href:`, id);
                    return id;
                }
            }
        }
        
        // Method 4: Try to get from post's parent containers
        let parent = post.parentElement;
        let depth = 0;
        while (parent && depth < 5) { // Limit search depth
            const parentIdAttrs = ['data-video-id', 'data-id', 'data-item-id'];
            for (let attr of parentIdAttrs) {
                if (parent.hasAttribute(attr)) {
                    const id = parent.getAttribute(attr);
                    console.log(`🔍 Video ID found from parent ${attr} at depth ${depth}:`, id);
                    return id;
                }
            }
            parent = parent.parentElement;
            depth++;
        }
        
        // Method 5: Try to extract from post's class names or IDs
        const postClasses = post.className;
        const postId = post.id;
        
        // Look for ID patterns in class names
        const classIdMatch = postClasses.match(/(\d{10,})/);
        if (classIdMatch) {
            const id = classIdMatch[1];
            console.log(`🔍 Video ID found from class name:`, id);
            return id;
        }
        
        // Look for ID patterns in post ID
        if (postId) {
            const idMatch = postId.match(/(\d{10,})/);
            if (idMatch) {
                const id = idMatch[1];
                console.log(`🔍 Video ID found from post ID:`, id);
                return id;
            }
        }
        
        console.log('🔍 No video ID found with any method');
        console.log('🔍 === EXTRACT VIDEO ID DEBUG END ===');
        return null;
    }

    async function downloadVideoAdvanced(videoInfo, post) {
        console.log('🔍 === DOWNLOAD VIDEO ADVANCED DEBUG START ===');
        console.log('🔍 Attempting download with video info:', videoInfo);
        
        try {
            // Method 1: Try to open video in new tab (most reliable)
            try {
                console.log('🔍 Method 1: Opening video in new tab');
                const newTab = window.open(videoInfo.src, '_blank');
                if (newTab) {
                    console.log('🔍 Successfully opened video in new tab');
                    return { success: true, method: 'new_tab', message: 'Video opened in new tab' };
                }
            } catch (error) {
                console.log('🔍 Method 1 failed:', error);
            }
            
            // Method 2: Try to trigger download with chrome.downloads API
            try {
                console.log('🔍 Method 2: Using chrome.downloads API');
                const filename = `tiktok_${videoInfo.username}_${videoInfo.videoId}.mp4`;
                
                // Send message to background script to handle download
                const response = await chrome.runtime.sendMessage({
                    action: 'downloadVideo',
                    data: {
                        url: videoInfo.src,
                        filename: filename
                    }
                });
                
                if (response && response.success) {
                    console.log('🔍 Chrome downloads API successful');
                    return { success: true, method: 'chrome_downloads', message: 'Download started via Chrome' };
                } else {
                    console.log('🔍 Chrome downloads API failed:', response);
                }
            } catch (error) {
                console.log('🔍 Method 2 failed:', error);
            }
            
            // Method 3: Try to create download link (fallback)
            try {
                console.log('🔍 Method 3: Creating download link');
                const link = document.createElement('a');
                link.href = videoInfo.src;
                link.download = `tiktok_${videoInfo.username}_${videoInfo.videoId}.mp4`;
                link.target = '_blank';
                
                // Add to DOM temporarily
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                console.log('🔍 Download link created successfully');
                return { success: true, method: 'download_link', message: 'Download link created' };
            } catch (error) {
                console.log('🔍 Method 3 failed:', error);
            }
            
            // Method 4: Try to copy video URL to clipboard
            try {
                console.log('🔍 Method 4: Copying video URL to clipboard');
                await navigator.clipboard.writeText(videoInfo.src);
                console.log('🔍 Video URL copied to clipboard');
                return { success: true, method: 'clipboard', message: 'Video URL copied to clipboard' };
            } catch (error) {
                console.log('🔍 Method 4 failed:', error);
            }
            
            console.log('🔍 All download methods failed');
            return { success: false, error: 'All download methods failed' };
            
        } catch (error) {
            console.error('🔍 Error in downloadVideoAdvanced:', error);
            return { success: false, error: error.message };
        } finally {
            console.log('🔍 === DOWNLOAD VIDEO ADVANCED DEBUG END ===');
        }
    }

    function showDownloadError(message) {
        // Create a better error modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 300px;
            text-align: center;
            border: 2px solid #dc3545;
        `;
        
        modal.innerHTML = `
            <div style="color: #dc3545; font-size: 24px; margin-bottom: 10px;">❌</div>
            <div style="color: #333; font-weight: 500; margin-bottom: 15px;">Download Error</div>
            <div style="color: #666; margin-bottom: 20px; line-height: 1.4;">${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            ">OK</button>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 5000);
    }

    function showDownloadSuccess(message) {
        // Create a success modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 300px;
            text-align: center;
            border: 2px solid #28a745;
        `;
        
        modal.innerHTML = `
            <div style="color: #28a745; font-size: 24px; margin-bottom: 10px;">✅</div>
            <div style="color: #333; font-weight: 500; margin-bottom: 15px;">Download Success</div>
            <div style="color: #666; margin-bottom: 20px; line-height: 1.4;">${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
            ">OK</button>
        `;
        
        document.body.appendChild(modal);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 3000);
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
