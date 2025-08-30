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
                    
                    post.appendChild(downloadBtn);
                    console.log('TikTok Full Extension: Alternative method added button to post', index + 1);
                    
                } catch (error) {
                    console.error('TikTok Full Extension: Error with alternative injection for post', index + 1, error);
                }
            });
        }
    }

    function removeDownloadButtons() {
        const existingButtons = document.querySelectorAll('.tiktok-download-btn');
        existingButtons.forEach(btn => btn.remove());
        console.log('TikTok Full Extension: Removed', existingButtons.length, 'existing download buttons');
    }

    function downloadVideo(postElement) {
        console.log('TikTok Full Extension: Download video requested for post:', postElement);
        
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
