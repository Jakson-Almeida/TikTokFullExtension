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

    // Note: constructVideoUrlFromId function removed - we now use actual working URLs from the page
    // instead of constructing CDN URLs that get blocked

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
                
                            // Show error message with better guidance for CDN issues
            let errorMessage = `Download failed: ${downloadResult.error}`;
            if (videoInfo.src && videoInfo.src.includes('(POTENTIALLY_BLOCKED)')) {
                errorMessage = 'This video uses a CDN URL that may be blocked. The extension will try to open the post page instead.';
            }
            showDownloadError(errorMessage);
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

        // Method 1: Try to get from video element with source tags (most reliable for actual video URLs)
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

        // Method 2: Look for actual video URLs in data attributes (prioritize these over page URLs)
        if (!videoSrc) {
            console.log('Method 2: Checking for actual video URLs in data attributes');
            
            // Look for video-specific data attributes that might contain actual video URLs
            const videoDataSelectors = [
                '[data-video-url]',
                '[data-video-src]',
                '[data-src]',
                '[data-href]',
                '[data-video]',
                '[data-media-url]',
                '[data-media-src]'
            ];
            
            for (let selector of videoDataSelectors) {
                const elements = postElement.querySelectorAll(selector);
                for (let element of elements) {
                    const dataVideo = element.getAttribute('data-video-url') || 
                                     element.getAttribute('data-video-src') ||
                                     element.getAttribute('data-src') ||
                                     element.getAttribute('data-href') ||
                                     element.getAttribute('data-video') ||
                                     element.getAttribute('data-media-url') ||
                                     element.getAttribute('data-media-src');
                    
                    if (dataVideo && !dataVideo.startsWith('blob:') && dataVideo.includes('tiktok.com')) {
                        // Check if this looks like an actual video URL (not a page URL)
                        if (dataVideo.includes('/video/') && !dataVideo.includes('www.tiktok.com')) {
                            console.log('Method 2: Found actual video URL in data attribute:', dataVideo);
                            videoSrc = dataVideo;
                            break;
                        }
                    }
                }
                if (videoSrc) break;
            }
        }

        // Method 3: Look for video URLs in the post's HTML content using regex (prioritize non-page URLs)
        if (!videoSrc) {
            console.log('Method 3: Searching HTML content for actual video URLs');
            const postHTML = postElement.innerHTML;
            
            // Look for CDN URLs first (these are usually actual video files)
            const cdnUrlMatch = postHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*\/[^"'\s]*\.mp4[^"'\s]*/);
            if (cdnUrlMatch && !cdnUrlMatch[0].startsWith('blob:')) {
                console.log('Method 3: Found CDN video URL:', cdnUrlMatch[0]);
                videoSrc = cdnUrlMatch[0];
            } else {
                // Look for any video URLs that don't look like page URLs
                const videoUrlMatch = postHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:')) {
                    // Check if it's not a page URL
                    if (!videoUrlMatch[0].includes('www.tiktok.com')) {
                        console.log('Method 3: Found actual video URL in HTML:', videoUrlMatch[0]);
                        videoSrc = videoUrlMatch[0];
                    }
                }
            }
        }

        // Method 4: Look for video URLs in parent elements (up to 3 levels up)
        if (!videoSrc) {
            console.log('Method 4: Checking parent elements for actual video URLs');
            let parent = postElement.parentElement;
            let level = 0;
            while (parent && level < 3) {
                const parentHTML = parent.innerHTML;
                
                // Look for CDN URLs first
                const cdnUrlMatch = parentHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*\/[^"'\s]*\.mp4[^"'\s]*/);
                if (cdnUrlMatch && !cdnUrlMatch[0].startsWith('blob:')) {
                    console.log('Method 4: Found CDN video URL in parent level', level, ':', cdnUrlMatch[0]);
                    videoSrc = cdnUrlMatch[0];
                    break;
                }
                
                // Look for other video URLs
                const videoUrlMatch = parentHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:') && !videoUrlMatch[0].includes('www.tiktok.com')) {
                    console.log('Method 4: Found actual video URL in parent level', level, ':', videoUrlMatch[0]);
                    videoSrc = videoUrlMatch[0];
                    break;
                }
                
                parent = parent.parentElement;
                level++;
            }
        }

        // Method 5: Try to extract from TikTok's internal data structures
        if (!videoSrc) {
            console.log('Method 5: Checking TikTok internal data structures');
            try {
                // Look for any script tags that might contain video data
                const scripts = document.querySelectorAll('script');
                for (let script of scripts) {
                    if (script.textContent && script.textContent.includes('video')) {
                        // Look for CDN URLs first
                        const cdnUrlMatch = script.textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*\/[^"'\s]*\.mp4[^"'\s]*/);
                        if (cdnUrlMatch && !cdnUrlMatch[0].startsWith('blob:')) {
                            console.log('Method 5: Found CDN video URL in script:', cdnUrlMatch[0]);
                            videoSrc = cdnUrlMatch[0];
                            break;
                        }
                        
                        // Look for other video URLs
                        const videoUrlMatch = script.textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                        if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:') && !videoUrlMatch[0].includes('www.tiktok.com')) {
                            console.log('Method 5: Found actual video URL in script:', videoUrlMatch[0]);
                            videoSrc = videoUrlMatch[0];
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log('Method 5: Error checking scripts:', error);
            }
        }

        // Method 6: Try to find video URLs in iframe sources
        if (!videoSrc) {
            console.log('Method 6: Checking iframe sources');
            const iframes = document.querySelectorAll('iframe');
            for (let iframe of iframes) {
                if (iframe.src && iframe.src.includes('tiktok.com') && iframe.src.includes('video')) {
                    console.log('Method 6: Found video URL in iframe:', iframe.src);
                    videoSrc = iframe.src;
                    break;
                }
            }
        }

        // Method 7: Look for video URLs in meta tags
        if (!videoSrc) {
            console.log('Method 7: Checking meta tags');
            const metaTags = document.querySelectorAll('meta[property*="video"], meta[name*="video"]');
            for (let meta of metaTags) {
                const content = meta.content || meta.getAttribute('content');
                if (content && content.includes('tiktok.com') && content.includes('video')) {
                    console.log('Method 7: Found video URL in meta tag:', content);
                    videoSrc = content;
                    break;
                }
            }
        }

        // Method 8: Try to extract from TikTok's video player data
        if (!videoSrc) {
            console.log('Method 8: Checking TikTok video player data');
            const videoPlayers = postElement.querySelectorAll('[class*="video-player"], [class*="xgplayer"], [id*="xgwrapper"]');
            for (let player of videoPlayers) {
                const playerHTML = player.innerHTML;
                
                // Look for CDN URLs first
                const cdnUrlMatch = playerHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*\/[^"'\s]*\.mp4[^"'\s]*/);
                if (cdnUrlMatch && !cdnUrlMatch[0].startsWith('blob:')) {
                    console.log('Method 8: Found CDN video URL in player:', cdnUrlMatch[0]);
                    videoSrc = cdnUrlMatch[0];
                    break;
                }
                
                // Look for other video URLs
                const videoUrlMatch = playerHTML.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:') && !videoUrlMatch[0].includes('www.tiktok.com')) {
                    console.log('Method 8: Found actual video URL in player:', videoUrlMatch[0]);
                    videoSrc = videoUrlMatch[0];
                    break;
                }
            }
        }

        // Method 9: Look for video URLs in data attributes of video-related elements
        if (!videoSrc) {
            console.log('Method 9: Checking video-related data attributes');
            const videoElements = postElement.querySelectorAll('[data-video-url], [data-video-src], [data-src], [data-href]');
            for (let element of videoElements) {
                const dataVideo = element.getAttribute('data-video-url') || 
                                 element.getAttribute('data-video-src') ||
                                 element.getAttribute('data-src') ||
                                 element.getAttribute('content');
                if (dataVideo && dataVideo.includes('tiktok.com') && !dataVideo.startsWith('blob:')) {
                    console.log('Method 9: Found video URL in data attribute:', dataVideo);
                    videoSrc = dataVideo;
                    break;
                }
            }
        }

        // Method 10: Try to find video URLs in the post's text content
        if (!videoSrc) {
            console.log('Method 10: Searching post text content for video URLs');
            const textContent = postElement.textContent || '';
            
            // Look for CDN URLs first
            const cdnUrlMatch = textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*\/[^"'\s]*\.mp4[^"'\s]*/);
            if (cdnUrlMatch && !cdnUrlMatch[0].startsWith('blob:')) {
                console.log('Method 10: Found CDN video URL in text content:', cdnUrlMatch[0]);
                videoSrc = cdnUrlMatch[0];
            } else {
                // Look for other video URLs
                const videoUrlMatch = textContent.match(/https:\/\/[^"'\s]+\.tiktok\.com\/[^"'\s]*video[^"'\s]*/);
                if (videoUrlMatch && !videoUrlMatch[0].startsWith('blob:') && !videoUrlMatch[0].includes('www.tiktok.com')) {
                    console.log('Method 10: Found actual video URL in text content:', videoUrlMatch[0]);
                    videoSrc = videoUrlMatch[0];
                }
            }
        }

        // Method 11: Try to find working video URLs from other posts on the page
        if (!videoSrc) {
            console.log('Method 11: Looking for working video URLs from other posts');
            try {
                // Find all video elements on the page that have working sources
                const allVideos = document.querySelectorAll('video source');
                for (let source of allVideos) {
                    const src = source.src;
                    if (src && !src.startsWith('blob:') && src.includes('tiktok.com') && src.includes('/video/')) {
                        console.log('Method 11: Found working video URL pattern:', src);
                        
                        // Check if this is a CDN URL that might get blocked
                        if (src.includes('v16-webapp-prime.tiktok.com') || src.includes('v19-webapp-prime.tiktok.com')) {
                            console.log('Method 11: Skipping CDN URL that might get blocked');
                            continue;
                        }
                        
                        // Use this working URL as our source
                        videoSrc = src;
                        console.log('Method 11: Using working video URL:', videoSrc);
                        break;
                    }
                }
            } catch (error) {
                console.log('Method 11: Error looking for working patterns:', error);
            }
        }

        // Method 12: Use the post's direct TikTok page URL as final fallback (only if no actual video URL found)
        if (!videoSrc) {
            console.log('Method 12: Using post direct URL as final fallback');
            const postLink = postElement.querySelector('a[href*="/video/"]');
            if (postLink && postLink.href) {
                console.log('Method 12: Using post link as final fallback:', postLink.href);
                videoSrc = postLink.href;
            }
        }

        // Method 13: Try to extract from TikTok's video player data attributes
        if (!videoSrc) {
            console.log('Method 13: Checking TikTok video player data attributes');
            try {
                // Look for video player containers that might have video URLs
                const videoContainers = postElement.querySelectorAll('[class*="video"], [class*="player"], [data-e2e*="video"]');
                for (let container of videoContainers) {
                    // Check for data attributes that might contain video URLs
                    const dataAttrs = ['data-video', 'data-src', 'data-url', 'data-href'];
                    for (let attr of dataAttrs) {
                        const value = container.getAttribute(attr);
                        if (value && value.includes('tiktok.com') && !value.startsWith('blob:') && !value.includes('www.tiktok.com')) {
                            console.log('Method 13: Found video URL in container data attribute:', value);
                            videoSrc = value;
                            break;
                        }
                    }
                    if (videoSrc) break;
                }
            } catch (error) {
                console.log('Method 13: Error checking video player data:', error);
            }
        }

        // Method 14: Try to extract from TikTok's internal video state
        if (!videoSrc) {
            console.log('Method 14: Checking TikTok internal video state');
            try {
                // Look for any elements that might contain video state information
                const stateElements = postElement.querySelectorAll('[data-state], [data-video-state], [data-media-state]');
                for (let element of stateElements) {
                    try {
                        const state = JSON.parse(element.getAttribute('data-state') || element.getAttribute('data-video-state') || element.getAttribute('data-media-state') || '{}');
                        if (state.videoUrl || state.video_url || state.src || state.url) {
                            const url = state.videoUrl || state.video_url || state.src || state.url;
                            if (url && url.includes('tiktok.com') && !url.startsWith('blob:') && !url.includes('www.tiktok.com')) {
                                console.log('Method 14: Found video URL in state data:', url);
                                videoSrc = url;
                                break;
                            }
                        }
                    } catch (parseError) {
                        // Skip invalid JSON
                        continue;
                    }
                }
            } catch (error) {
                console.log('Method 14: Error checking video state:', error);
            }
        }

        // Final validation - ensure we don't have a blob URL or blocked CDN URLs
        if (videoSrc) {
            if (videoSrc.startsWith('blob:')) {
                console.log('WARNING: Found blob URL, resetting to null');
                videoSrc = null;
            } else if (videoSrc.includes('v16-webapp-prime.tiktok.com') || videoSrc.includes('v19-webapp-prime.tiktok.com')) {
                // CDN URLs are likely to get blocked, try to find alternatives
                console.log('WARNING: Found CDN URL that might get blocked:', videoSrc);
                
                // Try to find a non-CDN alternative
                const postLink = postElement.querySelector('a[href*="/video/"]');
                if (postLink && postLink.href) {
                    console.log('Replacing blocked CDN URL with post link:', postLink.href);
                    videoSrc = postLink.href;
                } else {
                    console.log('No alternative found, keeping CDN URL but marking as potentially blocked');
                    videoSrc = videoSrc + ' (POTENTIALLY_BLOCKED)';
                }
            }
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
            // Method 1: Open direct video URL in new tab (PRIORITY 1 - as requested by user)
            try {
                console.log('🔍 Method 1: Opening direct video URL in new tab (second guide)');
                
                // Look for actual video sources in the post
                let directVideoUrl = null;
                const videoElement = post.querySelector('video');
                
                if (videoElement) {
                    // Check source tags first
                    const sources = videoElement.querySelectorAll('source');
                    if (sources.length > 0) {
                        for (let source of sources) {
                            const src = source.src;
                            if (src && !src.startsWith('blob:') && src.includes('tiktok.com')) {
                                directVideoUrl = src;
                                console.log('🔍 Found direct video URL from source tag:', directVideoUrl);
                                break;
                            }
                        }
                    }
                    
                    // Check video element's src attribute
                    if (!directVideoUrl && videoElement.src && !videoElement.src.startsWith('blob:')) {
                        directVideoUrl = videoElement.src;
                        console.log('🔍 Found direct video URL from video element:', directVideoUrl);
                    }
                }
                
                // If we found a direct video URL, open it in a new tab
                if (directVideoUrl) {
                    console.log('🔍 Opening direct video URL in new tab:', directVideoUrl);
                    const newTab = window.open(directVideoUrl, '_blank');
                    if (newTab) {
                        console.log('🔍 Successfully opened direct video URL in new tab');
                        return { 
                            success: true, 
                            method: 'direct_video_new_tab', 
                            message: 'Video opened in new tab (second guide). You can now download it from there.' 
                        };
                    }
                } else {
                    console.log('🔍 No direct video URL found, trying other methods');
                }
            } catch (error) {
                console.log('🔍 Method 1 failed:', error);
            }
            
            // Method 2: Try to trigger download with chrome.downloads API (PRIORITY 2)
            try {
                console.log('🔍 Method 2: Using chrome.downloads API');
                
                // Check if we have a direct video URL
                if (videoInfo.src && !videoInfo.src.includes('www.tiktok.com') && !videoInfo.src.includes('(POTENTIALLY_BLOCKED)')) {
                    const filename = `tiktok_${videoInfo.username || 'video'}_${videoInfo.videoId || Date.now()}.mp4`;
                    
                    console.log('🔍 Attempting download with URL:', videoInfo.src);
                    console.log('🔍 Filename:', filename);
                    
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
                        return { success: true, method: 'chrome_downloads', message: 'Download started successfully!' };
                    } else {
                        console.log('🔍 Chrome downloads API failed:', response);
                    }
                } else {
                    console.log('🔍 Skipping chrome.downloads API - not a direct video URL');
                }
            } catch (error) {
                console.log('🔍 Method 2 failed:', error);
            }
            
            // Method 3: Try to create download link (PRIORITY 3)
            try {
                console.log('🔍 Method 3: Creating download link');
                
                if (videoInfo.src && !videoInfo.src.includes('www.tiktok.com') && !videoInfo.src.includes('(POTENTIALLY_BLOCKED)')) {
                    const link = document.createElement('a');
                    link.href = videoInfo.src;
                    link.download = `tiktok_${videoInfo.username || 'video'}_${videoInfo.videoId || Date.now()}.mp4`;
                    link.target = '_blank';
                    
                    // Add to DOM temporarily
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    console.log('🔍 Download link created successfully');
                    return { success: true, method: 'download_link', message: 'Download started via browser download' };
                } else {
                    console.log('🔍 Skipping download link - not a direct video URL');
                }
            } catch (error) {
                console.log('🔍 Method 3 failed:', error);
            }
            
            // Method 4: Try to copy video URL to clipboard (PRIORITY 4)
            try {
                console.log('🔍 Method 4: Copying video URL to clipboard');
                
                let urlToCopy = videoInfo.src;
                
                // If we have a TikTok page URL, try to find the actual video URL
                if (urlToCopy && urlToCopy.includes('www.tiktok.com') && urlToCopy.includes('/video/')) {
                    // Look for actual video URLs in the post
                    const videoElement = post.querySelector('video');
                    if (videoElement) {
                        const sources = videoElement.querySelectorAll('source');
                        for (let source of sources) {
                            const src = source.src;
                            if (src && !src.startsWith('blob:') && src.includes('tiktok.com')) {
                                urlToCopy = src;
                                console.log('🔍 Using extracted video URL for clipboard:', urlToCopy);
                                break;
                            }
                        }
                    }
                }
                
                if (urlToCopy) {
                    await navigator.clipboard.writeText(urlToCopy);
                    console.log('🔍 Video URL copied to clipboard');
                    return { success: true, method: 'clipboard', message: 'Video URL copied to clipboard. You can paste it in a new tab to download.' };
                }
            } catch (error) {
                console.log('🔍 Method 4 failed:', error);
            }
            
            // Method 5: Open TikTok page in new tab as fallback (PRIORITY 5)
            try {
                console.log('🔍 Method 5: Opening TikTok page in new tab as fallback');
                
                // Only do this if we have a TikTok page URL
                if (videoInfo.src && videoInfo.src.includes('www.tiktok.com') && videoInfo.src.includes('/video/')) {
                    console.log('🔍 Opening TikTok page in new tab for manual download');
                    const newTab = window.open(videoInfo.src, '_blank');
                    if (newTab) {
                        console.log('🔍 Successfully opened TikTok page in new tab');
                        return { 
                            success: true, 
                            method: 'tiktok_page_new_tab', 
                            message: 'TikTok page opened in new tab (second guide). Right-click on the video and select "Save video as..." to download.' 
                        };
                    }
                }
            } catch (error) {
                console.log('🔍 Method 5 failed:', error);
            }
            
            console.log('🔍 All download methods failed');
            return { success: false, error: 'Could not download video. Please try right-clicking on the video and selecting "Save video as..."' };
            
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
