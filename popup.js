document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const currentPage = document.getElementById('currentPage');
    const userId = document.getElementById('userId');
    const username = document.getElementById('username');
    const refreshBtn = document.getElementById('refreshBtn');
    const checkPageBtn = document.getElementById('checkPageBtn');
    
    // Tab elements
    const menuTabs = document.querySelectorAll('.menu-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Download tool elements
    const enableDownloadBtn = document.getElementById('enableDownloadBtn');

    const downloadSettingsBtn = document.getElementById('downloadSettingsBtn');
    const watermarkOption = document.getElementById('watermarkOption');
    const audioOption = document.getElementById('audioOption');
    
    // Settings elements
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const autoCheckAuth = document.getElementById('autoCheckAuth');
    const showDownloadBtns = document.getElementById('showDownloadBtns');
    const downloadQuality = document.getElementById('downloadQuality');

    // Initialize popup
    initializePopup();

    // Event listeners
    refreshBtn.addEventListener('click', checkAuthenticationStatus);
    checkPageBtn.addEventListener('click', checkCurrentPage);
    
    // Tab switching
    menuTabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });
    
    // Download tool events
    enableDownloadBtn.addEventListener('click', enableDownloadMode);

    downloadSettingsBtn.addEventListener('click', openDownloadSettings);
    
    // Settings events
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);

    function initializePopup() {
        // Set initial state
        setStatus('checking', 'Checking...');
        
        // Check authentication status when popup opens
        checkAuthenticationStatus();
        
        // Load saved settings
        loadSettings();
    }

    function switchTab(tabName) {
        // Remove active class from all tabs and contents
        menuTabs.forEach(tab => tab.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
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

    async function enableDownloadMode() {
        console.log('=== DOWNLOAD MODE DEBUG START ===');
        console.log('1. Function called');
        
        try {
            console.log('2. Querying active tab...');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('3. Active tab found:', tab);
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                console.log('4. Not on TikTok page, showing alert');
                console.log('Please navigate to a TikTok page first');
                return;
            }
            
            console.log('4. On TikTok page:', tab.url);

            // First, test communication with content script
            console.log('5. Testing communication with content script...');
            let testResponse;
            
            // Try ping first
            try {
                console.log('6. Sending ping message...');
                const pingMessage = { action: 'ping' };
                console.log('6a. Ping message:', pingMessage);
                console.log('6b. Ping message type:', typeof pingMessage);
                console.log('6c. Ping message action type:', typeof pingMessage.action);
                
                testResponse = await chrome.tabs.sendMessage(tab.id, pingMessage);
                console.log('7. Ping response received:', testResponse);
                console.log('7a. Ping response type:', typeof testResponse);
                console.log('7b. Ping response keys:', testResponse ? Object.keys(testResponse) : 'null/undefined');
                console.log('7c. Ping response stringified:', JSON.stringify(testResponse));
                
                // Check if response has the expected structure
                if (testResponse && typeof testResponse === 'object') {
                    console.log('7d. Response has success property:', 'success' in testResponse);
                    console.log('7e. Response success value:', testResponse.success);
                    console.log('7f. Response error property:', 'error' in testResponse);
                    console.log('7g. Response error value:', testResponse.error);
                }
            } catch (error) {
                console.error('8. Ping failed with error:', error);
                console.error('8a. Error message:', error.message);
                console.error('8b. Error stack:', error.stack);
                
                // Try alternative approach - get page info
                console.log('9. Trying alternative communication method...');
                try {
                    console.log('9a. Sending getPageInfo message...');
                    testResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
                    console.log('9b. Alternative response (getPageInfo):', testResponse);
                    if (testResponse && testResponse.success) {
                        console.log('9c. Alternative method successful, using this response');
                        testResponse = { success: true, message: 'Communication established via getPageInfo' };
                    } else {
                        throw new Error('Alternative method also failed');
                    }
                } catch (altError) {
                    console.error('10. Alternative method also failed:', altError);
                    
                    // Final attempt - wait a bit and try again
                    console.log('11. Waiting 2 seconds and trying one more time...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    try {
                        console.log('11a. Retry ping attempt...');
                        testResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                        console.log('11b. Retry response:', testResponse);
                        if (testResponse && testResponse.success) {
                            console.log('11c. Retry successful after delay');
                        } else {
                            throw new Error('Retry also failed');
                        }
                    } catch (retryError) {
                        console.error('12. All communication attempts failed:', retryError);
                        console.log('Cannot communicate with TikTok page. Please:\n1. Refresh the page\n2. Wait a few seconds\n3. Try again');
                        return;
                    }
                }
            }

            if (!testResponse || !testResponse.success) {
                console.error('13. Invalid ping response:', testResponse);
                console.error('13a. Response is null/undefined:', testResponse === null || testResponse === undefined);
                console.error('13b. Response type:', typeof testResponse);
                console.error('13c. Response success property:', testResponse?.success);
                console.log('Content script is not responding properly. Please refresh the TikTok page and try again.');
                return;
            }

            console.log('14. Communication test successful, enabling download mode...');

            // Send message to content script to enable download mode
            console.log('15. Sending enableDownloadMode message...');
            const downloadOptions = {
                watermark: watermarkOption.checked,
                audio: audioOption.checked,
                quality: downloadQuality.value
            };
            console.log('15a. Download options:', downloadOptions);
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'enableDownloadMode',
                options: downloadOptions
            });

            console.log('16. Enable download mode response:', response);

            if (response && response.success) {
                console.log('17. Download mode enabled successfully');
                enableDownloadBtn.textContent = 'Download Mode Active';
                enableDownloadBtn.classList.add('btn-success');
                console.log('Download mode enabled! Download buttons will appear on TikTok posts.\n\nIf you don\'t see download buttons, try scrolling down or refreshing the page.');
            } else {
                console.error('18. Failed to enable download mode');
                const errorMsg = response?.error || 'Unknown error';
                console.error('18a. Error message:', errorMsg);
                console.log(`Failed to enable download mode: ${errorMsg}\n\nPlease refresh the TikTok page and try again.`);
            }
            
            console.log('=== DOWNLOAD MODE DEBUG END ===');
            
        } catch (error) {
            console.error('=== DOWNLOAD MODE ERROR ===');
            console.error('Error enabling download mode:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (error.message.includes('Could not establish connection')) {
                console.log('Cannot connect to TikTok page. Please:\n1. Make sure you\'re on a TikTok page\n2. Refresh the page\n3. Try again');
            } else {
                console.log(`Error enabling download mode: ${error.message}\n\nPlease try again or refresh the page.`);
            }
            
            console.error('=== DOWNLOAD MODE ERROR END ===');
        }
    }



    function openDownloadSettings() {
        // Switch to settings tab
        switchTab('settings');
    }

    async function saveSettings() {
        const settings = {
            autoCheckAuth: autoCheckAuth.checked,
            showDownloadBtns: showDownloadBtns.checked,
            downloadQuality: downloadQuality.value,
            watermarkOption: watermarkOption.checked,
            audioOption: audioOption.checked
        };

        try {
            await chrome.storage.local.set({ settings });
            console.log('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            console.log('Error saving settings. Please try again.');
        }
    }

    async function resetSettings() {
        if (true) { // Auto-confirm for better user experience
            // Reset to default values
            autoCheckAuth.checked = true;
            showDownloadBtns.checked = true;
            downloadQuality.value = 'medium';
            watermarkOption.checked = true;
            audioOption.checked = true;
            
            // Save default settings
            await saveSettings();
        }
    }

    async function loadSettings() {
        try {
            const result = await chrome.storage.local.get(['settings']);
            if (result.settings) {
                const settings = result.settings;
                autoCheckAuth.checked = settings.autoCheckAuth !== undefined ? settings.autoCheckAuth : true;
                showDownloadBtns.checked = settings.showDownloadBtns !== undefined ? settings.showDownloadBtns : true;
                downloadQuality.value = settings.downloadQuality || 'medium';
                watermarkOption.checked = settings.watermarkOption !== undefined ? settings.watermarkOption : true;
                audioOption.checked = settings.audioOption !== undefined ? settings.audioOption : true;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    // Check status every 5 seconds when popup is open
    const statusInterval = setInterval(checkAuthenticationStatus, 5000);
    
    // Clean up interval when popup is closed
    window.addEventListener('beforeunload', () => {
        clearInterval(statusInterval);
    });
});
