// TikTok Full Extension - Content Script
// This script runs on TikTok pages and detects authentication status

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

    // Initialize content script
    initialize();

    function initialize() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener(handleMessage);
        
        // Initial authentication check
        checkAuthentication();
        
        // Set up periodic checks
        setInterval(checkAuthentication, 10000); // Check every 10 seconds
        
        // Listen for page changes
        observePageChanges();
    }

    function handleMessage(request, sender, sendResponse) {
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
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
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
                setTimeout(checkAuthentication, 1000); // Check after navigation
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Expose functions for debugging
    window.tikTokExtension = {
        checkAuthentication,
        getPageInfo,
        authData
    };

})();
