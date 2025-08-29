document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const currentPage = document.getElementById('currentPage');
    const userId = document.getElementById('userId');
    const username = document.getElementById('username');
    const refreshBtn = document.getElementById('refreshBtn');
    const checkPageBtn = document.getElementById('checkPageBtn');

    // Initialize popup
    initializePopup();

    // Event listeners
    refreshBtn.addEventListener('click', checkAuthenticationStatus);
    checkPageBtn.addEventListener('click', checkCurrentPage);

    function initializePopup() {
        // Set initial state
        setStatus('checking', 'Checking...');
        
        // Check authentication status when popup opens
        checkAuthenticationStatus();
    }

    function setStatus(type, text) {
        // Remove all status classes
        statusIcon.classList.remove('authenticated', 'not-authenticated', 'checking');
        
        // Add appropriate class and update text
        switch(type) {
            case 'authenticated':
                statusIcon.classList.add('authenticated');
                statusIcon.textContent = '✓';
                break;
            case 'not-authenticated':
                statusIcon.classList.add('not-authenticated');
                statusIcon.textContent = '✗';
                break;
            case 'checking':
                statusIcon.classList.add('checking');
                statusIcon.textContent = '⟳';
                break;
            case 'error':
                statusIcon.classList.add('not-authenticated');
                statusIcon.textContent = '!';
                break;
        }
        
        statusText.textContent = text;
    }

    async function checkAuthenticationStatus() {
        try {
            setStatus('checking', 'Checking...');
            
            // Get current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                setStatus('error', 'Not on TikTok');
                updateInfo('Not on TikTok', '-', '-');
                return;
            }

            // Send message to content script to check authentication
            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'checkAuthentication' 
            });

            if (response && response.success) {
                if (response.authenticated) {
                    setStatus('authenticated', 'Authenticated');
                    updateInfo(
                        response.pageType || 'TikTok Page',
                        response.userId || 'N/A',
                        response.username || 'N/A'
                    );
                } else {
                    setStatus('not-authenticated', 'Not Authenticated');
                    updateInfo(
                        response.pageType || 'TikTok Page',
                        '-',
                        '-'
                    );
                }
            } else {
                setStatus('error', 'Error checking status');
                updateInfo('Error', '-', '-');
            }
        } catch (error) {
            console.error('Error checking authentication:', error);
            setStatus('error', 'Error occurred');
            updateInfo('Error', '-', '-');
        }
    }

    async function checkCurrentPage() {
        try {
            setStatus('checking', 'Checking page...');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                setStatus('error', 'Not on TikTok');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, { 
                action: 'getPageInfo' 
            });

            if (response && response.success) {
                updateInfo(
                    response.pageType || 'TikTok Page',
                    response.userId || '-',
                    response.username || '-'
                );
                
                if (response.authenticated) {
                    setStatus('authenticated', 'Authenticated');
                } else {
                    setStatus('not-authenticated', 'Not Authenticated');
                }
            }
        } catch (error) {
            console.error('Error checking page:', error);
            setStatus('error', 'Error occurred');
        }
    }

    function updateInfo(page, id, name) {
        currentPage.textContent = page;
        userId.textContent = id;
        username.textContent = name;
    }

    // Check status every 5 seconds when popup is open
    const statusInterval = setInterval(checkAuthenticationStatus, 5000);
    
    // Clean up interval when popup is closed
    window.addEventListener('beforeunload', () => {
        clearInterval(statusInterval);
    });
});
