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
            method: 'api', // Default to API method to match popup
            quality: 'medium'
        }
    };

    // Initialize content script
    initialize();

    function initialize() {
        console.log('=== CONTENT SCRIPT INITIALIZE DEBUG START ===');
        console.log('1. TikTok Full Extension: Initializing...');
        
        // Listen for messages from popup
        console.log('2. Setting up message listener...');
        chrome.runtime.onMessage.addListener(handleMessage);
        console.log('3. Message listener set up');
        
        // Load saved settings
        console.log('4. Loading saved settings...');
        loadSettings().then(() => {
            console.log('5. Settings loaded, proceeding with initialization...');
            
            // Initial authentication check
            console.log('6. Performing initial authentication check...');
            checkAuthentication();
            
            // Set up periodic checks
            console.log('7. Setting up periodic authentication checks...');
            setInterval(checkAuthentication, 10000);
            
            // Check if we should auto-start download mode
            console.log('8. Checking auto-start conditions...');
            console.log('   - autoStart:', downloadMode.autoStart);
            console.log('   - authenticated:', authData.authenticated);
            console.log('   - downloadMode.enabled:', downloadMode.enabled);
            
            if (downloadMode.autoStart && authData.authenticated && !downloadMode.enabled) {
                console.log('9. Auto-start conditions met, enabling download mode');
                downloadMode.enabled = true;
                saveSettings();
                injectDownloadButtons();
            } else {
                console.log('9. Auto-start conditions not met:');
                console.log('   - autoStart:', downloadMode.autoStart);
                console.log('   - authenticated:', authData.authenticated);
                console.log('   - downloadMode.enabled:', downloadMode.enabled);
            }
        });
        
        console.log('10. Initialization complete');
        console.log('=== CONTENT SCRIPT INITIALIZE DEBUG END ===');
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
                    console.log('TikTok Full Extension: Request options received:', request.options);
                    
                    downloadMode.enabled = true;
                    
                    // Update download mode options if provided
                    if (request.options) {
                        // Ensure options object exists
                        if (!downloadMode.options) {
                            downloadMode.options = {};
                        }
                        
                        downloadMode.options = {
                            ...downloadMode.options,
                            ...request.options
                        };
                        console.log('TikTok Full Extension: Updated download options:', downloadMode.options);
                        console.log('TikTok Full Extension: Method set to:', downloadMode.options.method);
                    } else {
                        console.log('TikTok Full Extension: No options provided, using defaults');
                        // Set default method if none provided
                        if (!downloadMode.options) {
                            downloadMode.options = { method: 'browser' };
                        }
                    }
                    
                    saveSettings();
                    injectDownloadButtons();
                    sendResponse({
                        success: true,
                        message: 'Download mode enabled successfully',
                        options: downloadMode.options
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
                    
                case 'updateDownloadMethod':
                    console.log('TikTok Full Extension: Updating download method to:', request.method);
                    if (request.method) {
                        if (!downloadMode.options) {
                            downloadMode.options = {};
                        }
                        downloadMode.options.method = request.method;
                        saveSettings();
                        console.log('TikTok Full Extension: Download method updated to:', downloadMode.options.method);
                    }
                    sendResponse({
                        success: true,
                        message: 'Download method updated successfully',
                        method: downloadMode.options.method
                    });
                    break;
                    
                case 'syncSettings':
                    console.log('TikTok Full Extension: Syncing settings from popup...');
                    // Use Promise-based approach instead of async/await
                    chrome.storage.local.get(['settings']).then(result => {
                        if (result.settings) {
                            console.log('TikTok Full Extension: Found popup settings:', result.settings);
                            if (!downloadMode.options) {
                                downloadMode.options = {};
                            }
                            downloadMode.options.method = result.settings.downloadMethod || 'api';
                            downloadMode.options.quality = result.settings.downloadQuality || 'medium';
                            saveSettings();
                            console.log('TikTok Full Extension: Settings synced successfully:', downloadMode.options);
                        }
                        sendResponse({
                            success: true,
                            message: 'Settings synced successfully',
                            options: downloadMode.options
                        });
                    }).catch(error => {
                        console.error('TikTok Full Extension: Error syncing settings:', error);
                        sendResponse({
                            success: false,
                            error: 'Failed to sync settings: ' + error.message
                        });
                    });
                    return true; // Keep message channel open for async response
                    
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
        
        // Find TikTok posts/videos with multiple selector strategies
        let posts = [];
        
        // Strategy 1: Look for video containers
        const videoContainers = document.querySelectorAll('[data-e2e="search-card"], [data-e2e="video-feed-item"], .video-feed-item, .search-card');
        posts = posts.concat(Array.from(videoContainers));
        
        // Strategy 2: Look for TikTok's newer video structure
        const newerPosts = document.querySelectorAll('[data-e2e="browse-video"], [data-e2e="browse-video-item"], .browse-video, .browse-video-item');
        posts = posts.concat(Array.from(newerPosts));
        
        // Strategy 3: Look for any div containing video elements
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
            const container = video.closest('div[data-e2e], div[class*="video"], div[class*="post"], div[class*="card"]');
            if (container && !posts.includes(container)) {
                posts.push(container);
            }
        });
        
        // Strategy 4: Look for common TikTok post patterns
        const commonPosts = document.querySelectorAll('div[class*="DivItemContainer"], div[class*="DivVideoFeedV2"], div[class*="DivSearchCardContainer"]');
        posts = posts.concat(Array.from(commonPosts));
        
        // Strategy 5: Look for any div that might contain TikTok content
        const potentialPosts = document.querySelectorAll('div[class*="tiktok"], div[class*="video"], div[class*="post"], div[class*="card"]');
        potentialPosts.forEach(div => {
            if (div.querySelector('video, img[src*="tiktok"], a[href*="/video/"]') && !posts.includes(div)) {
                posts.push(div);
            }
        });
        
        // Remove duplicates
        posts = [...new Set(posts)];
        
        console.log('TikTok Full Extension: Found', posts.length, 'posts to inject buttons into');
        console.log('TikTok Full Extension: Post selectors used:', {
            videoContainers: videoContainers.length,
            newerPosts: newerPosts.length,
            videoElements: videoElements.length,
            commonPosts: commonPosts.length,
            potentialPosts: potentialPosts.length,
            finalPosts: posts.length
        });
        
        // Debug: Log the first few posts to see their structure
        posts.slice(0, 3).forEach((post, index) => {
            console.log(`TikTok Full Extension: Post ${index + 1} structure:`, {
                tagName: post.tagName,
                className: post.className,
                id: post.id,
                dataE2e: post.getAttribute('data-e2e'),
                hasVideo: !!post.querySelector('video'),
                hasImg: !!post.querySelector('img'),
                hasLink: !!post.querySelector('a[href*="/video/"]')
            });
        });
        
        posts.forEach((post, index) => {
            try {
                // Create copy link button
                const copyLinkBtn = document.createElement('button');
                copyLinkBtn.className = 'tiktok-copy-link-btn';
                copyLinkBtn.innerHTML = '🔗';
                copyLinkBtn.title = 'Copy Post Link';
                copyLinkBtn.style.cssText = `
                    position: absolute;
                    top: 10px;
                    right: 50px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: rgba(0, 0, 0, 0.7);
                    border: 2px solid white;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    z-index: 1000;
                    transition: 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Add click event for copy link
                copyLinkBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyPostLink(post);
                });
                
                // Create download button
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'tiktok-download-btn';
                downloadBtn.innerHTML = '⬇️';
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
                    transition: 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                
                // Add click event for download
                downloadBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadVideo(post);
                });
                
                // Make post container relative positioned if not already
                if (getComputedStyle(post).position === 'static') {
                    post.style.position = 'relative';
                }
                
                // Add both buttons to post
                post.appendChild(copyLinkBtn);
                post.appendChild(downloadBtn);
                console.log('TikTok Full Extension: Added copy link and download buttons to post', index + 1);
                
            } catch (error) {
                console.error('TikTok Full Extension: Error adding download button to post', index + 1, error);
            }
        });
        
        console.log('TikTok Full Extension: Download button injection complete');
        
        // If no posts found, try a different approach
        if (posts.length === 0) {
            console.log('TikTok Full Extension: No posts found with standard selectors, trying alternative approach...');
            setTimeout(tryAlternativeInjection, 2000);
        }
    }

    function tryAlternativeInjection() {
        console.log('TikTok Full Extension: Trying alternative injection method...');
        
        // Look for any element that might be a TikTok post
        const allDivs = document.querySelectorAll('div');
        const potentialPosts = [];
        
        allDivs.forEach(div => {
            // Check if this div looks like it contains TikTok content
            const hasVideo = div.querySelector('video');
            const hasTikTokLink = div.querySelector('a[href*="/video/"]');
            const hasTikTokImage = div.querySelector('img[src*="tiktok"]');
            const hasReasonableSize = div.offsetWidth > 200 && div.offsetHeight > 200;
            
            if ((hasVideo || hasTikTokLink || hasTikTokImage) && hasReasonableSize) {
                potentialPosts.push(div);
            }
        });
        
        console.log('TikTok Full Extension: Alternative method found', potentialPosts.length, 'potential posts');
        
        if (potentialPosts.length > 0) {
            // Use the first few potential posts
            const postsToUse = potentialPosts.slice(0, 5);
            postsToUse.forEach((post, index) => {
                                 try {
                     // Create copy link button
                     const copyLinkBtn = document.createElement('button');
                     copyLinkBtn.className = 'tiktok-copy-link-btn';
                     copyLinkBtn.innerHTML = '🔗';
                     copyLinkBtn.title = 'Copy Post Link';
                     copyLinkBtn.style.cssText = `
                         position: absolute;
                         top: 10px;
                         right: 50px;
                         width: 36px;
                         height: 36px;
                         border-radius: 50%;
                         background: rgba(0, 0, 0, 0.7);
                         border: 2px solid white;
                         color: white;
                         font-size: 16px;
                         cursor: pointer;
                         z-index: 1000;
                         transition: 0.3s;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                     `;
                     
                     // Add click event for copy link
                     copyLinkBtn.addEventListener('click', (e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         copyPostLink(post);
                     });
                     
                     const downloadBtn = document.createElement('button');
                     downloadBtn.className = 'tiktok-download-btn';
                     downloadBtn.innerHTML = '⬇️';
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
                         transition: 0.3s;
                         display: flex;
                         align-items: center;
                         justify-content: center;
                     `;
                     
                     downloadBtn.addEventListener('click', (e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         downloadVideo(post);
                     });
                     
                     if (getComputedStyle(post).position === 'static') {
                         post.style.position = 'relative';
                     }
                     
                     // Add both buttons to post
                     post.appendChild(copyLinkBtn);
                     post.appendChild(downloadBtn);
                     console.log('TikTok Full Extension: Alternative method added copy link and download buttons to post', index + 1);
                    
                } catch (error) {
                    console.error('TikTok Full Extension: Error with alternative injection for post', index + 1, error);
                }
            });
        }
    }

    function removeDownloadButtons() {
        const existingDownloadButtons = document.querySelectorAll('.tiktok-download-btn');
        const existingCopyLinkButtons = document.querySelectorAll('.tiktok-copy-link-btn');
        const existingAPIDownloadContainers = document.querySelectorAll('.tiktok-api-download-container');
        
        existingDownloadButtons.forEach(btn => btn.remove());
        existingCopyLinkButtons.forEach(btn => btn.remove());
        existingAPIDownloadContainers.forEach(container => container.remove());
        
        console.log('TikTok Full Extension: Removed', existingDownloadButtons.length, 'existing download buttons,', existingCopyLinkButtons.length, 'copy link buttons, and', existingAPIDownloadContainers.length, 'API download containers');
    }

    function copyPostLink(postElement) {
        console.log('TikTok Full Extension: Copy post link requested for post:', postElement);
        
        try {
            // Look for TikTok video page link
            const videoLink = postElement.querySelector('a[href*="/video/"]');
            if (videoLink && videoLink.href) {
                const postUrl = videoLink.href;
                console.log('TikTok Full Extension: Found post URL:', postUrl);
                
                // Copy to clipboard
                navigator.clipboard.writeText(postUrl).then(() => {
                    console.log('TikTok Full Extension: Post link copied to clipboard:', postUrl);
                    
                    // Show visual feedback
                    showCopyFeedback(postElement);
                }).catch(err => {
                    console.error('TikTok Full Extension: Failed to copy to clipboard:', err);
                    // Fallback: try to copy using document.execCommand
                    fallbackCopyToClipboard(postUrl);
                });
            } else {
                console.log('TikTok Full Extension: No video link found in post');
                // Fallback: copy current page URL
                navigator.clipboard.writeText(window.location.href).then(() => {
                    console.log('TikTok Full Extension: Current page URL copied to clipboard');
                    showCopyFeedback(postElement);
                }).catch(err => {
                    console.error('TikTok Full Extension: Failed to copy current page URL:', err);
                });
            }
        } catch (error) {
            console.error('TikTok Full Extension: Error copying post link:', error);
        }
    }

    function fallbackCopyToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                console.log('TikTok Full Extension: Post link copied using fallback method');
            } else {
                console.error('TikTok Full Extension: Fallback copy method failed');
            }
        } catch (err) {
            console.error('TikTok Full Extension: Error with fallback copy method:', err);
        }
    }

    function showCopyFeedback(postElement) {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.innerHTML = '✅ Copied!';
        feedback.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            background: rgba(0, 128, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1001;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        // Add CSS animation
        if (!document.querySelector('#tiktok-extension-styles')) {
            const style = document.createElement('style');
            style.id = 'tiktok-extension-styles';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(-10px); }
                    20% { opacity: 1; transform: translateY(0); }
                    80% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        postElement.appendChild(feedback);
        
        // Remove feedback after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    function downloadVideo(postElement) {
        console.log('TikTok Full Extension: Download video requested for post:', postElement);
        
        // Debug: Log the current download mode settings
        console.log('TikTok Full Extension: Current download mode:', downloadMode);
        console.log('TikTok Full Extension: Download options:', downloadMode.options);
        console.log('TikTok Full Extension: Method setting:', downloadMode.options?.method);
        
        // Check if we should use API method
        if (downloadMode.options && downloadMode.options.method === 'api') {
            console.log('TikTok Full Extension: Using API download method');
            downloadVideoViaAPI(postElement);
            return;
        }
        
        console.log('TikTok Full Extension: Using browser download method');
        
        try {
            // Strategy 1: Try to extract video URL from TikTok's internal data
            const internalVideoUrl = extractVideoUrlFromTikTokData(postElement);
            if (internalVideoUrl) {
                console.log('TikTok Full Extension: Found internal video URL:', internalVideoUrl);
                window.open(internalVideoUrl, '_blank');
                return;
            }
            
            // Strategy 2: Look for actual video element with src
            const videoElement = postElement.querySelector('video');
            if (videoElement && videoElement.src && videoElement.src !== '') {
                console.log('TikTok Full Extension: Found video source:', videoElement.src);
                
                // Check if it's a valid video URL (not data: or blob:)
                if (videoElement.src.startsWith('http') && !videoElement.src.includes('data:') && !videoElement.src.includes('blob:')) {
                    window.open(videoElement.src, '_blank');
                    return;
                }
            }
            
            // Strategy 3: Look for video element with currentSrc
            if (videoElement && videoElement.currentSrc && videoElement.currentSrc !== '') {
                console.log('TikTok Full Extension: Found video currentSrc:', videoElement.currentSrc);
                
                if (videoElement.currentSrc.startsWith('http') && !videoElement.currentSrc.includes('data:') && !videoElement.currentSrc.includes('blob:')) {
                    window.open(videoElement.currentSrc, '_blank');
                    return;
                }
            }
            
            // Strategy 4: Try to construct TikTok video URL from patterns
            const constructedVideoUrl = constructTikTokVideoUrl(postElement);
            if (constructedVideoUrl) {
                console.log('TikTok Full Extension: Constructed video URL:', constructedVideoUrl);
                window.open(constructedVideoUrl, '_blank');
                return;
            }
            
            // Strategy 5: Look for TikTok video page link and extract video ID
            const videoLink = postElement.querySelector('a[href*="/video/"]');
            if (videoLink && videoLink.href) {
                console.log('TikTok Full Extension: Found video link:', videoLink.href);
                
                // Extract video ID from URL
                const videoIdMatch = videoLink.href.match(/\/video\/(\d+)/);
                if (videoIdMatch) {
                    const videoId = videoIdMatch[1];
                    console.log('TikTok Full Extension: Extracted video ID:', videoId);
                    
                    // Try to construct direct video URL (TikTok's video CDN pattern)
                    const directVideoUrl = `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/`;
                    console.log('TikTok Full Extension: Attempting direct video URL:', directVideoUrl);
                    
                    // Open the direct video URL in new tab
                    window.open(directVideoUrl, '_blank');
                    return;
                }
            }
            
            // Strategy 6: Look for any img with TikTok CDN URLs that might be video thumbnails
            const tiktokImages = postElement.querySelectorAll('img[src*="tiktokcdn.com"]');
            if (tiktokImages.length > 0) {
                // Get the first TikTok image and try to convert it to video URL
                const firstImg = tiktokImages[0];
                console.log('TikTok Full Extension: Found TikTok image:', firstImg.src);
                
                // Try to extract video ID from image URL or construct video URL
                const imgUrl = firstImg.src;
                if (imgUrl.includes('/tos-maliva-p-')) {
                    // This looks like a video thumbnail, try to construct video URL
                    const videoUrl = imgUrl.replace('/tos-maliva-p-', '/tos-maliva-v-').replace(/\.jpeg.*$/, '.mp4');
                    console.log('TikTok Full Extension: Attempting video URL from image:', videoUrl);
                    
                    window.open(videoUrl, '_blank');
                    return;
                }
            }
            
            // Strategy 7: Look for any data attributes that might contain video info
            const videoData = postElement.querySelector('[data-video-id], [data-video-url], [data-video-src]');
            if (videoData) {
                const videoId = videoData.getAttribute('data-video-id') || 
                               videoData.getAttribute('data-video-url') || 
                               videoData.getAttribute('data-video-src');
                
                if (videoId && videoId.startsWith('http')) {
                    console.log('TikTok Full Extension: Found video data attribute:', videoId);
                    window.open(videoId, '_blank');
                    return;
                }
            }
            
            // Strategy 8: Look for any script tags or meta tags with video information
            const scripts = postElement.querySelectorAll('script');
            for (let script of scripts) {
                if (script.textContent && script.textContent.includes('video')) {
                    console.log('TikTok Full Extension: Found script with video content');
                    // Try to extract video URL from script content
                    const videoUrlMatch = script.textContent.match(/"videoUrl":"([^"]+)"/);
                    if (videoUrlMatch) {
                        const videoUrl = videoUrlMatch[1];
                        console.log('TikTok Full Extension: Extracted video URL from script:', videoUrl);
                        window.open(videoUrl, '_blank');
                        return;
                    }
                }
            }
            
            // Fallback: If no video found, open the TikTok post page in new tab
            // This allows user to manually download from the post page
            if (videoLink && videoLink.href) {
                console.log('TikTok Full Extension: No direct video found, opening TikTok post page in new tab');
                window.open(videoLink.href, '_blank');
            } else {
                console.log('TikTok Full Extension: No video or link found, opening current page in new tab');
                window.open(window.location.href, '_blank');
            }
            
        } catch (error) {
            console.error('TikTok Full Extension: Error downloading video:', error);
            
            // Final fallback: try to open any video link found
            const videoLink = postElement.querySelector('a[href*="/video/"]');
            if (videoLink && videoLink.href) {
                window.open(videoLink.href, '_blank');
            } else {
                window.open(window.location.href, '_blank');
            }
        }
    }

    // Helper function to extract TikTok post URL from a post element
    function extractPostUrl(postElement) {
        // Try multiple selectors to find the post URL
        const selectors = [
            'a[href*="/video/"]',
            'a[href*="/@"]',
            'a[href*="tiktok.com"]',
            '[data-e2e="user-post-item"] a',
            '[data-e2e="browse-video"] a'
        ];

        for (const selector of selectors) {
            const link = postElement.querySelector(selector);
            if (link && link.href) {
                // Ensure we have a full TikTok URL
                let url = link.href;
                if (url.startsWith('/')) {
                    url = 'https://www.tiktok.com' + url;
                } else if (!url.startsWith('http')) {
                    url = 'https://www.tiktok.com/' + url;
                }
                console.log('TikTok Full Extension: Extracted post URL:', url);
                return url;
            }
        }

        // Fallback: try to construct URL from data attributes
        const videoId = postElement.getAttribute('data-video-id') || 
                       postElement.querySelector('[data-video-id]')?.getAttribute('data-video-id');
        
        if (videoId) {
            const url = `https://www.tiktok.com/@user/video/${videoId}`;
            console.log('TikTok Full Extension: Constructed post URL from video ID:', url);
            return url;
        }

        console.log('TikTok Full Extension: Could not extract post URL from element');
        return null;
    }

    async function downloadVideoViaAPI(postElement) {
        console.log('TikTok Full Extension: API download method called');
        
        try {
            const postUrl = extractPostUrl(postElement);
            if (!postUrl) {
                console.log('TikTok Full Extension: Could not extract post URL, falling back to browser method');
                downloadVideo(postElement);
                return;
            }

            console.log('TikTok Full Extension: Attempting API download for:', postUrl);
            showDownloadFeedback(postElement, '🔄 Processing...', 'info');

            // Try multiple TikTok download APIs as fallbacks
            const apis = [
                {
                    name: 'Simple TikTok Downloader',
                    url: 'https://tiktok-download-without-watermark.p.rapidapi.com/',
                    method: 'GET',
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
                    params: { url: postUrl }
                },
                {
                    name: 'TikWM API',
                    url: 'https://www.tikwm.com/api/',
                    method: 'POST',
                    body: JSON.stringify({ url: postUrl }),
                    headers: { 'Content-Type': 'application/json' }
                },
                {
                    name: 'TikTok Downloader Service',
                    url: 'https://tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com/vid/index',
                    method: 'GET',
                    headers: { 
                        'X-RapidAPI-Key': 'demo-key',
                        'X-RapidAPI-Host': 'tiktok-downloader-download-tiktok-videos-without-watermark.p.rapidapi.com'
                    },
                    params: { url: postUrl }
                }
            ];

            let apiResponse = null;
            let workingApi = null;

            for (const api of apis) {
                try {
                    console.log(`TikTok Full Extension: Trying ${api.name}...`);
                    
                    let url = api.url;
                    const options = {
                        method: api.method,
                        headers: api.headers
                    };

                    if (api.body) {
                        options.body = api.body;
                    }

                    // Handle GET requests with params
                    if (api.method === 'GET' && api.params) {
                        const urlParams = new URLSearchParams(api.params);
                        url = `${api.url}?${urlParams.toString()}`;
                    }

                    const response = await fetch(url, options);
                    
                    if (response.ok) {
                        apiResponse = await response.json();
                        workingApi = api.name;
                        console.log(`TikTok Full Extension: ${api.name} succeeded:`, apiResponse);
                        break;
                    } else {
                        console.log(`TikTok Full Extension: ${api.name} failed with status:`, response.status);
                    }
                } catch (error) {
                    console.log(`TikTok Full Extension: ${api.name} error:`, error.message);
                }
            }

            if (apiResponse && workingApi) {
                console.log('TikTok Full Extension: API download successful, injecting download buttons directly');
                injectAPIDownloadButtons(postElement, apiResponse, postUrl, workingApi);
            } else {
                console.log('TikTok Full Extension: All APIs failed, falling back to browser method');
                showDownloadFeedback(postElement, '❌ API failed, using browser method', 'error');
                
                // Wait 2 seconds then fallback to browser method
                setTimeout(() => {
                    downloadVideo(postElement);
                }, 2000);
            }

        } catch (error) {
            console.error('TikTok Full Extension: API download error:', error);
            showDownloadFeedback(postElement, '❌ API Error', 'error');
            
            // Fallback to browser method after error
            setTimeout(() => {
                downloadVideo(postElement);
            }, 2000);
        }
    }

    function showDownloadOptionsModal(postElement, apiData, originalUrl, apiName) {
        // Remove existing modal if any
        const existingModal = document.getElementById('tiktok-download-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'tiktok-download-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 15px;
            max-width: 500px;
            width: 90%;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        `;

        const header = document.createElement('h2');
        header.textContent = `Download Options (${apiName || 'API'})`;
        header.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            font-size: 24px;
        `;

        const info = document.createElement('p');
        info.textContent = 'Select your preferred download option:';
        info.style.cssText = `
            margin: 0 0 25px 0;
            color: #666;
            font-size: 16px;
        `;

        modalContent.appendChild(header);
        modalContent.appendChild(info);

        // Create download buttons based on API response
        const downloadButtons = [];

        // Try to extract video URLs from different API response formats
        let videoUrl = null;
        let watermarkUrl = null;
        let coverUrl = null;

        console.log('TikTok Full Extension: Parsing API response:', apiData);

        // Handle different API response formats
        if (apiData.play) {
            videoUrl = apiData.play;
        } else if (apiData.data && apiData.data.play) {
            videoUrl = apiData.data.play;
        } else if (apiData.video && apiData.video.play_addr) {
            videoUrl = apiData.video.play_addr.url_list && apiData.video.play_addr.url_list[0];
        } else if (apiData.video_url) {
            videoUrl = apiData.video_url;
        } else if (apiData.url) {
            videoUrl = apiData.url;
        } else if (apiData.download_url) {
            videoUrl = apiData.download_url;
        }

        if (apiData.play_watermark) {
            watermarkUrl = apiData.play_watermark;
        } else if (apiData.data && apiData.data.play_watermark) {
            watermarkUrl = apiData.data.play_watermark;
        } else if (apiData.watermark_url) {
            watermarkUrl = apiData.watermark_url;
        }

        if (apiData.cover) {
            coverUrl = apiData.cover;
        } else if (apiData.data && apiData.data.cover) {
            coverUrl = apiData.data.cover;
        } else if (apiData.cover_url) {
            coverUrl = apiData.cover_url;
        } else if (apiData.thumbnail) {
            coverUrl = apiData.thumbnail;
        }

        console.log('TikTok Full Extension: Extracted URLs - Video:', videoUrl, 'Watermark:', watermarkUrl, 'Cover:', coverUrl);

        // Add download buttons for available options
        if (videoUrl) {
            downloadButtons.push(createDownloadButton('🎬 Download Without Watermark', videoUrl, 'primary'));
        }

        if (watermarkUrl) {
            downloadButtons.push(createDownloadButton('💧 Download With Watermark', watermarkUrl, 'secondary'));
        }

        if (coverUrl) {
            downloadButtons.push(createDownloadButton('🖼️ Download Cover Image', coverUrl, 'tertiary'));
        }

        // If no specific URLs found, try to use the original API response
        if (downloadButtons.length === 0) {
            console.log('TikTok Full Extension: No specific URLs found in API response, creating generic buttons');
            
            // Create a generic download button that opens the API response in a new tab
            if (apiData.url) {
                downloadButtons.push(createDownloadButton('🔗 Open Download Link', apiData.url, 'primary'));
            } else {
                // Fallback: show the API response data for debugging
                const debugInfo = document.createElement('div');
                debugInfo.style.cssText = `
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 15px 0;
                    text-align: left;
                    font-family: monospace;
                    font-size: 12px;
                    max-height: 200px;
                    overflow-y: auto;
                `;
                debugInfo.textContent = `API Response: ${JSON.stringify(apiData, null, 2)}`;
                modalContent.appendChild(debugInfo);
            }
        }

        // Add all download buttons
        downloadButtons.forEach(button => {
            modalContent.appendChild(button);
            modalContent.appendChild(document.createElement('br'));
        });

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.style.cssText = `
            background: #666;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
            transition: background 0.3s;
        `;

        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = '#555';
        });

        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = '#666';
        });

        closeButton.addEventListener('click', () => {
            modal.remove();
        });

        modalContent.appendChild(closeButton);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Auto-close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        console.log('TikTok Full Extension: Download options modal displayed');
    }

    function createDownloadButton(text, url, style) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${style === 'success' ? '#28a745' : style === 'primary' ? '#007bff' : '#6c757d'};
            color: white;
            border: none;
            padding: 12px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
        
        button.addEventListener('click', () => {
            console.log('TikTok Full Extension: Downloading from API URL:', url);
            // Open download link in new tab
            window.open(url, '_blank');
        });
        
        return button;
    }

    function showDownloadFeedback(postElement, message, type) {
        // Remove existing feedback
        const existingFeedback = postElement.querySelector('.tiktok-download-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }
        
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'tiktok-download-feedback';
        feedback.innerHTML = message;
        feedback.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            background: ${type === 'error' ? 'rgba(220, 53, 69, 0.9)' : 'rgba(40, 167, 69, 0.9)'};
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            z-index: 1001;
            animation: fadeInOut 2s ease-in-out;
        `;
        
        postElement.appendChild(feedback);
        
        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    async function loadSettings() {
        console.log('=== CONTENT SCRIPT LOAD SETTINGS DEBUG START ===');
        try {
            console.log('1. Loading settings from chrome.storage.local...');
            // Load BOTH popup settings and downloadMode to ensure sync
            const result = await chrome.storage.local.get(['settings', 'downloadMode']);
            console.log('2. Raw storage result:', result);
            
            // First, check if popup settings exist and sync them
            if (result.settings && result.settings.downloadMethod) {
                console.log('3. Found popup settings with downloadMethod:', result.settings.downloadMethod);
                // Sync popup settings to downloadMode
                if (!downloadMode.options) {
                    downloadMode.options = {};
                }
                downloadMode.options.method = result.settings.downloadMethod;
                downloadMode.options.quality = result.settings.downloadQuality || 'medium';
                console.log('4. Synced popup settings to downloadMode:', downloadMode.options);
            }
            
            // Then load any existing downloadMode settings (these take precedence)
            if (result.downloadMode) {
                console.log('5. Found downloadMode settings:', result.downloadMode);
                downloadMode = { ...downloadMode, ...result.downloadMode };
                console.log('6. Merged with defaults, result:', downloadMode);
                
                // If download mode was previously enabled, restore it
                if (downloadMode.enabled) {
                    console.log('7. Download mode was enabled, will restore after 2s delay');
                    setTimeout(injectDownloadButtons, 2000); // Wait for page to load
                } else {
                    console.log('7. Download mode was not enabled, skipping restoration');
                }
            } else {
                console.log('5. No downloadMode settings found, using defaults');
            }
            
            // Set default values for new installations
            if (downloadMode.autoStart === undefined) {
                console.log('8. Setting default autoStart to true');
                downloadMode.autoStart = true;
            }
            
            // Ensure method is always set
            if (!downloadMode.options || !downloadMode.options.method) {
                console.log('9. Setting default download method to api');
                if (!downloadMode.options) {
                    downloadMode.options = {};
                }
                downloadMode.options.method = 'api';
            }
            
            console.log('10. Final download mode settings:', downloadMode);
            console.log('11. Download method setting:', downloadMode.options?.method);
            console.log('=== CONTENT SCRIPT LOAD SETTINGS DEBUG END ===');
        } catch (error) {
            console.error('=== CONTENT SCRIPT LOAD SETTINGS ERROR ===');
            console.error('Error loading settings:', error);
            console.error('=== CONTENT SCRIPT LOAD SETTINGS ERROR END ===');
        }
    }

    async function saveSettings() {
        console.log('=== CONTENT SCRIPT SAVE SETTINGS DEBUG START ===');
        try {
            console.log('1. Saving downloadMode to chrome.storage.local:', downloadMode);
            await chrome.storage.local.set({ downloadMode });
            console.log('2. Settings saved successfully');
            
            // Verify the save
            console.log('3. Verifying saved settings...');
            const result = await chrome.storage.local.get(['downloadMode']);
            console.log('4. Verification result:', result);
            
            if (result.downloadMode && JSON.stringify(result.downloadMode) === JSON.stringify(downloadMode)) {
                console.log('5. Settings verification successful!');
            } else {
                console.warn('5. Settings verification failed - saved vs expected:');
                console.warn('   Saved:', result.downloadMode);
                console.warn('   Expected:', downloadMode);
            }
            
            console.log('=== CONTENT SCRIPT SAVE SETTINGS DEBUG END ===');
        } catch (error) {
            console.error('=== CONTENT SCRIPT SAVE SETTINGS ERROR ===');
            console.error('Error saving settings:', error);
            console.error('=== CONTENT SCRIPT SAVE SETTINGS ERROR END ===');
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

    // Additional injection attempts with different timing strategies
    function setupInjectionRetries() {
        // Try injection multiple times with different delays
        const delays = [1000, 3000, 5000, 8000, 12000];
        
        delays.forEach((delay, index) => {
            setTimeout(() => {
                if (downloadMode.enabled) {
                    console.log(`TikTok Full Extension: Retry injection attempt ${index + 1} after ${delay}ms`);
                    injectDownloadButtons();
                }
            }, delay);
        });
    }

    // Set up retry mechanism when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('TikTok Full Extension: DOM loaded, setting up injection retries');
            setTimeout(setupInjectionRetries, 1000);
        });
    } else {
        console.log('TikTok Full Extension: DOM already loaded, setting up injection retries');
        setTimeout(setupInjectionRetries, 1000);
    }

    // Also try injection when the page is fully loaded
    window.addEventListener('load', () => {
        console.log('TikTok Full Extension: Page fully loaded, attempting injection');
        setTimeout(() => {
            if (downloadMode.enabled) {
                injectDownloadButtons();
            }
        }, 2000);
    });

    // Listen for dynamic content changes (TikTok loads content dynamically)
    const observer = new MutationObserver((mutations) => {
        if (downloadMode.enabled) {
            let shouldInject = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if new nodes contain video content
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.querySelector && (node.querySelector('video') || node.querySelector('a[href*="/video/"]'))) {
                                shouldInject = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldInject) {
                console.log('TikTok Full Extension: Dynamic content detected, re-injecting buttons');
                setTimeout(injectDownloadButtons, 1000);
            }
        }
    });

    // Start observing for dynamic content
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Function to try to extract video URLs from TikTok's internal data
    function extractVideoUrlFromTikTokData(postElement) {
        try {
            // Strategy 1: Look for TikTok's internal video data in window object
            if (window.__INITIAL_STATE__ && window.__INITIAL_STATE__.ItemModule) {
                console.log('TikTok Full Extension: Found TikTok initial state');
                // Try to find video data in the state
                const itemModule = window.__INITIAL_STATE__.ItemModule;
                for (let key in itemModule) {
                    const item = itemModule[key];
                    if (item && item.video && item.video.playAddr) {
                        console.log('TikTok Full Extension: Found video playAddr in state:', item.video.playAddr);
                        return item.video.playAddr;
                    }
                }
            }

            // Strategy 2: Look for video data in React components
            const reactRoot = document.querySelector('#root') || document.querySelector('[data-reactroot]');
            if (reactRoot) {
                // Try to access React component data
                const reactKey = Object.keys(reactRoot).find(key => key.startsWith('__reactProps$'));
                if (reactKey) {
                    const reactProps = reactRoot[reactKey];
                    if (reactProps && reactProps.videoData) {
                        console.log('TikTok Full Extension: Found React video data');
                        return reactProps.videoData.videoUrl || reactProps.videoData.playAddr;
                    }
                }
            }

            // Strategy 3: Look for any global variables that might contain video data
            for (let key in window) {
                if (key.toLowerCase().includes('video') || key.toLowerCase().includes('tiktok')) {
                    try {
                        const value = window[key];
                        if (value && typeof value === 'object' && value.videoUrl) {
                            console.log('TikTok Full Extension: Found video URL in global variable:', key);
                            return value.videoUrl;
                        }
                    } catch (e) {
                        // Ignore errors when accessing window properties
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('TikTok Full Extension: Error extracting video URL from TikTok data:', error);
            return null;
        }
    }

    // Function to try to construct video URL from TikTok patterns
    function constructTikTokVideoUrl(postElement) {
        try {
            // Look for video ID in various places
            let videoId = null;
            
            // From video link
            const videoLink = postElement.querySelector('a[href*="/video/"]');
            if (videoLink) {
                const match = videoLink.href.match(/\/video\/(\d+)/);
                if (match) videoId = match[1];
            }
            
            // From data attributes
            if (!videoId) {
                const dataVideo = postElement.querySelector('[data-video-id]');
                if (dataVideo) videoId = dataVideo.getAttribute('data-video-id');
            }
            
            // From class names or IDs that might contain video ID
            if (!videoId) {
                const videoContainer = postElement.querySelector('[class*="video"], [id*="video"]');
                if (videoContainer) {
                    const idMatch = videoContainer.id.match(/(\d+)/);
                    if (idMatch) videoId = idMatch[1];
                }
            }
            
            if (videoId) {
                console.log('TikTok Full Extension: Constructing video URL for ID:', videoId);
                
                // Try different TikTok video URL patterns
                const videoUrlPatterns = [
                    `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/`,
                    `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/index.m3u8`,
                    `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/index.mp4`,
                    `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/video.mp4`,
                    `https://v16-webapp.tiktok.com/video/tos/useast2a/${videoId}/play.mp4`
                ];
                
                // Return the first pattern (user can try others if needed)
                return videoUrlPatterns[0];
            }
            
            return null;
        } catch (error) {
            console.error('TikTok Full Extension: Error constructing TikTok video URL:', error);
            return null;
        }
    }

    // Function to download cover image
    function downloadCoverImage(postElement) {
        console.log('TikTok Full Extension: Download cover image requested for post:', postElement);
        
        try {
            // Look for cover image in the post
            const coverImage = postElement.querySelector('img[src*="tiktok"], img[src*="tiktokcdn"], img[src*="sf16-akcdn"]');
            
            if (coverImage && coverImage.src) {
                const imageUrl = coverImage.src;
                console.log('TikTok Full Extension: Found cover image:', imageUrl);
                
                // Open the image in a new tab for download
                window.open(imageUrl, '_blank');
            } else {
                // Try to find any image that might be a cover
                const anyImage = postElement.querySelector('img');
                if (anyImage && anyImage.src) {
                    console.log('TikTok Full Extension: Using fallback image:', anyImage.src);
                    window.open(anyImage.src, '_blank');
                } else {
                    console.log('TikTok Full Extension: No cover image found');
                    // Show feedback
                    showDownloadFeedback(postElement, '❌ No cover image found', 'error');
                }
            }
        } catch (error) {
            console.error('TikTok Full Extension: Error downloading cover image:', error);
            showDownloadFeedback(postElement, '❌ Error downloading cover', 'error');
        }
    }

    // Function to inject API download buttons directly on the post
    function injectAPIDownloadButtons(postElement, apiData, originalUrl, apiName) {
        console.log('TikTok Full Extension: Injecting API download buttons directly on post');
        
        // Remove existing API download buttons if any
        const existingAPIBtns = postElement.querySelectorAll('.tiktok-api-download-btn');
        existingAPIBtns.forEach(btn => btn.remove());
        
        // Extract video URLs from API response
        let videoUrl = null;
        let watermarkUrl = null;
        let coverUrl = null;

        // Handle different API response formats
        if (apiData.play) {
            videoUrl = apiData.play;
        } else if (apiData.data && apiData.data.play) {
            videoUrl = apiData.data.play;
        } else if (apiData.video && apiData.video.play_addr) {
            videoUrl = apiData.video.play_addr.url_list && apiData.video.play_addr.url_list[0];
        } else if (apiData.video_url) {
            videoUrl = apiData.video_url;
        } else if (apiData.url) {
            videoUrl = apiData.url;
        } else if (apiData.download_url) {
            videoUrl = apiData.download_url;
        }

        if (apiData.play_watermark) {
            watermarkUrl = apiData.play_watermark;
        } else if (apiData.data && apiData.data.play_watermark) {
            watermarkUrl = apiData.data.play_watermark;
        } else if (apiData.watermark_url) {
            watermarkUrl = apiData.watermark_url;
        }

        if (apiData.cover) {
            coverUrl = apiData.cover;
        } else if (apiData.data && apiData.data.cover) {
            coverUrl = apiData.data.cover;
        } else if (apiData.cover_url) {
            coverUrl = apiData.cover_url;
        } else if (apiData.thumbnail) {
            coverUrl = apiData.thumbnail;
        }

        console.log('TikTok Full Extension: Extracted URLs - Video:', videoUrl, 'Watermark:', watermarkUrl, 'Cover:', coverUrl);

        // Create download buttons container
        const downloadContainer = document.createElement('div');
        downloadContainer.className = 'tiktok-api-download-container';
        downloadContainer.style.cssText = `
            position: absolute;
            top: 50px;
            right: 10px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 1002;
            background: rgba(0, 0, 0, 0.8);
            padding: 12px;
            border-radius: 8px;
            border: 2px solid white;
        `;

        // Add title
        const title = document.createElement('div');
        title.textContent = `📥 ${apiName}`;
        title.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: bold;
            text-align: center;
            margin-bottom: 8px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.3);
            padding-bottom: 4px;
        `;
        downloadContainer.appendChild(title);

        // Create download buttons for available options
        if (videoUrl) {
            const downloadBtn = createInlineDownloadButton('🎬 Download Video', videoUrl, 'primary');
            downloadContainer.appendChild(downloadBtn);
        }

        if (watermarkUrl) {
            const watermarkBtn = createInlineDownloadButton('💧 Download with Watermark', watermarkUrl, 'secondary');
            downloadContainer.appendChild(watermarkBtn);
        }

        if (coverUrl) {
            const coverBtn = createInlineDownloadButton('🖼️ Download Cover', coverUrl, 'tertiary');
            downloadContainer.appendChild(coverBtn);
        }

        // If no specific URLs found, create a generic button
        if (!videoUrl && !watermarkUrl && !coverUrl) {
            if (apiData.url) {
                const genericBtn = createInlineDownloadButton('🔗 Open Download Link', apiData.url, 'primary');
                downloadContainer.appendChild(genericBtn);
            }
        }

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.title = 'Close download options';
        closeBtn.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #dc3545;
            color: white;
            border: none;
            cursor: pointer;
            font-size: 12px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        closeBtn.addEventListener('click', () => {
            downloadContainer.remove();
        });
        downloadContainer.appendChild(closeBtn);

        // Add the container to the post
        postElement.appendChild(downloadContainer);

        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (downloadContainer.parentNode) {
                downloadContainer.remove();
            }
        }, 30000);

        console.log('TikTok Full Extension: API download buttons injected successfully');
    }

    // Helper function to create inline download buttons
    function createInlineDownloadButton(text, url, style) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            background: ${style === 'primary' ? '#007bff' : style === 'secondary' ? '#6c757d' : '#28a745'};
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 500;
            transition: all 0.2s ease;
            white-space: nowrap;
            min-width: 120px;
        `;
        
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-1px)';
            button.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        });
        
        button.addEventListener('click', () => {
            console.log('TikTok Full Extension: Downloading from API URL:', url);
            // Open download link in new tab
            window.open(url, '_blank');
        });
        
        return button;
    }

    // Expose functions for debugging
    window.tikTokExtension = {
        checkAuthentication,
        getPageInfo,
        authData,
        downloadMode,
        injectDownloadButtons,
        removeDownloadButtons,
        testDownloadMethod: () => {
            console.log('=== DOWNLOAD METHOD TEST ===');
            console.log('Current download mode:', downloadMode);
            console.log('Options:', downloadMode.options);
            console.log('Method:', downloadMode.options?.method);
            console.log('Enabled:', downloadMode.enabled);
            console.log('==========================');
        }
    };

    console.log('TikTok Full Extension: Content script fully initialized and ready');
})();
