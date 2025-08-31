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

    const autoStartToggle = document.getElementById('autoStartToggle');
    const autoStartStatus = document.getElementById('autoStartStatus');
    
    // Settings elements
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const resetSettingsBtn = document.getElementById('resetSettingsBtn');
    const autoCheckAuth = document.getElementById('autoCheckAuth');
    const showDownloadBtns = document.getElementById('showDownloadBtns');
    const downloadQuality = document.getElementById('downloadQuality');
    const downloadMethod = document.getElementById('downloadMethod');

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
    enableDownloadBtn.addEventListener('click', toggleDownloadMode);
    downloadSettingsBtn.addEventListener('click', openDownloadSettings);
    autoStartToggle.addEventListener('click', toggleAutoStart);
    
    // Settings events
    saveSettingsBtn.addEventListener('click', saveSettings);
    resetSettingsBtn.addEventListener('click', resetSettings);
    
    // Debug button event
    const debugSettingsBtn = document.getElementById('debugSettingsBtn');
    debugSettingsBtn.addEventListener('click', testCurrentSettings);
    
    // Download method change listener
    downloadMethod.addEventListener('change', async function() {
        console.log('Download method changed to:', downloadMethod.value);
        
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url && tab.url.includes('tiktok.com')) {
                // Update the content script immediately
                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'updateDownloadMethod',
                    method: downloadMethod.value
                });
                
                if (response && response.success) {
                    console.log('Download method updated successfully:', downloadMethod.value);
                }
            }
        } catch (error) {
            console.error('Error updating download method:', error);
        }
    });

    // Debug function to test current settings
    async function testCurrentSettings() {
        console.log('=== TEST CURRENT SETTINGS DEBUG START ===');
        
        try {
            // Test popup settings
            console.log('1. POPUP SETTINGS:');
            console.log('   - autoCheckAuth.checked:', autoCheckAuth.checked);
            console.log('   - showDownloadBtns.checked:', showDownloadBtns.checked);
            console.log('   - downloadQuality.value:', downloadQuality.value);
            console.log('   - downloadMethod.value:', downloadMethod.value);
            
            // Test chrome.storage.local settings
            console.log('2. CHROME STORAGE SETTINGS:');
            const result = await chrome.storage.local.get(['settings', 'downloadMode']);
            console.log('   - Raw storage result:', result);
            
            if (result.settings) {
                console.log('   - settings object:', result.settings);
            } else {
                console.log('   - No settings found in storage');
            }
            
            if (result.downloadMode) {
                console.log('   - downloadMode object:', result.downloadMode);
            } else {
                console.log('   - No downloadMode found in storage');
            }
            
            // Test content script communication
            console.log('3. CONTENT SCRIPT COMMUNICATION TEST:');
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab.url && tab.url.includes('tiktok.com')) {
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'getDownloadModeStatus'
                    });
                    
                    if (response && response.success) {
                        console.log('   - Content script response:', response);
                        console.log('   - Current download method in content script:', response.downloadMode?.options?.method);
                    } else {
                        console.log('   - Content script responded but with error:', response);
                    }
                } catch (error) {
                    console.log('   - Cannot communicate with content script:', error.message);
                }
            } else {
                console.log('   - Not on TikTok page, cannot test content script');
            }
            
            console.log('=== TEST CURRENT SETTINGS DEBUG END ===');
        } catch (error) {
            console.error('=== TEST CURRENT SETTINGS ERROR ===');
            console.error('Error testing settings:', error);
            console.error('=== TEST CURRENT SETTINGS ERROR END ===');
        }
    }

    function initializePopup() {
        console.log('=== INITIALIZE POPUP DEBUG START ===');
        
        // Set initial state
        console.log('1. Setting initial status...');
        setStatus('checking', 'Checking...');
        
        // Check authentication status when popup opens
        console.log('2. Checking authentication status...');
        checkAuthenticationStatus();
        
        // Load saved settings
        console.log('3. Loading saved settings...');
        loadSettings();
        
        // Load download mode status after a short delay
        console.log('4. Setting up delayed download mode status load...');
        setTimeout(() => {
            console.log('5. Loading download mode status (delayed)...');
            loadDownloadModeStatus();
        }, 1000);
        
        console.log('=== INITIALIZE POPUP DEBUG END ===');
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

    async function toggleDownloadMode() {
        console.log('=== DOWNLOAD MODE TOGGLE DEBUG START ===');
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

            // Check current download mode status
            const isCurrentlyActive = enableDownloadBtn.textContent === 'Download Mode Active';
            console.log('5. Current download mode status:', isCurrentlyActive ? 'Active' : 'Inactive');

            if (isCurrentlyActive) {
                // Currently active, so disable it
                console.log('6. Download mode is currently active, disabling...');
                await disableDownloadMode(tab);
            } else {
                // Currently inactive, so enable it
                console.log('6. Download mode is currently inactive, enabling...');
                await enableDownloadMode(tab);
            }
            
            console.log('=== DOWNLOAD MODE TOGGLE DEBUG END ===');
            
        } catch (error) {
            console.error('=== DOWNLOAD MODE TOGGLE ERROR ===');
            console.error('Error toggling download mode:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (error.message.includes('Could not establish connection')) {
                console.log('Cannot connect to TikTok page. Please:\n1. Make sure you\'re on a TikTok page\n2. Refresh the page\n3. Try again');
            } else {
                console.log(`Error toggling download mode: ${error.message}\n\nPlease try again or refresh the page.`);
            }
            
            console.error('=== DOWNLOAD MODE TOGGLE ERROR END ===');
        }
    }

    async function enableDownloadMode(tab) {
        console.log('=== ENABLE DOWNLOAD MODE DEBUG START ===');
        
        try {
            // First, test communication with content script
            console.log('1. Testing communication with content script...');
            let testResponse;
            
            // Try ping first
            try {
                console.log('2. Sending ping message...');
                const pingMessage = { action: 'ping' };
                testResponse = await chrome.tabs.sendMessage(tab.id, pingMessage);
                console.log('3. Ping response received:', testResponse);
                
                // Check if response has the expected structure
                if (testResponse && typeof testResponse === 'object') {
                    console.log('3a. Response has success property:', 'success' in testResponse);
                    console.log('3b. Response success value:', testResponse.success);
                }
            } catch (error) {
                console.error('4. Ping failed with error:', error);
                
                // Try alternative approach - get page info
                console.log('5. Trying alternative communication method...');
                try {
                    testResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getPageInfo' });
                    console.log('6. Alternative response (getPageInfo):', testResponse);
                    if (testResponse && testResponse.success) {
                        console.log('7. Alternative method successful, using this response');
                        testResponse = { success: true, message: 'Communication established via getPageInfo' };
                    } else {
                        throw new Error('Alternative method also failed');
                    }
                } catch (altError) {
                    console.error('8. Alternative method also failed:', altError);
                    
                    // Final attempt - wait a bit and try again
                    console.log('9. Waiting 2 seconds and trying one more time...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    try {
                        testResponse = await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
                        if (testResponse && testResponse.success) {
                            console.log('10. Retry successful after delay');
                        } else {
                            throw new Error('Retry also failed');
                        }
                    } catch (retryError) {
                        console.error('11. All communication attempts failed:', retryError);
                        console.log('Cannot communicate with TikTok page. Please:\n1. Refresh the page\n2. Wait a few seconds\n3. Try again');
                        return;
                    }
                }
            }

            if (!testResponse || !testResponse.success) {
                console.error('12. Invalid ping response:', testResponse);
                console.log('Content script is not responding properly. Please refresh the TikTok page and try again.');
                return;
            }

            console.log('13. Communication test successful, enabling download mode...');

            // Send message to content script to enable download mode
            console.log('14. Sending enableDownloadMode message...');
            const downloadOptions = {
                quality: downloadQuality.value,
                method: downloadMethod.value || 'browser' // Ensure method is always set
            };
            console.log('14a. Download options:', downloadOptions);
            console.log('14b. Download method value:', downloadMethod.value);
            console.log('14c. Sending message with options:', downloadOptions);
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'enableDownloadMode',
                options: downloadOptions
            });

            console.log('15. Enable download mode response:', response);

            if (response && response.success) {
                console.log('16. Download mode enabled successfully');
                enableDownloadBtn.textContent = 'Download Mode Active';
                enableDownloadBtn.classList.add('btn-success');
                console.log('Download mode enabled! Download buttons will appear on TikTok posts.\n\nIf you don\'t see download buttons, try scrolling down or refreshing the page.');
            } else {
                console.error('17. Failed to enable download mode');
                const errorMsg = response?.error || 'Unknown error';
                console.error('17a. Error message:', errorMsg);
                console.log(`Failed to enable download mode: ${errorMsg}\n\nPlease refresh the TikTok page and try again.`);
            }
            
            console.log('=== ENABLE DOWNLOAD MODE DEBUG END ===');
            
        } catch (error) {
            console.error('=== ENABLE DOWNLOAD MODE ERROR ===');
            console.error('Error enabling download mode:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (error.message.includes('Could not establish connection')) {
                console.log('Cannot connect to TikTok page. Please:\n1. Make sure you\'re on a TikTok page\n2. Refresh the page\n3. Try again');
            } else {
                console.log(`Error enabling download mode: ${error.message}\n\nPlease try again or refresh the page.`);
            }
            
            console.error('=== ENABLE DOWNLOAD MODE ERROR END ===');
        }
    }

    async function disableDownloadMode(tab) {
        console.log('=== DISABLE DOWNLOAD MODE DEBUG START ===');
        
        try {
            console.log('1. Sending disableDownloadMode message...');
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'disableDownloadMode'
            });

            console.log('2. Disable download mode response:', response);

            if (response && response.success) {
                console.log('3. Download mode disabled successfully');
                enableDownloadBtn.textContent = 'Enable Download Mode';
                enableDownloadBtn.classList.remove('btn-success');
                console.log('Download mode disabled! Download buttons have been removed from TikTok posts.');
            } else {
                console.error('4. Failed to disable download mode');
                const errorMsg = response?.error || 'Unknown error';
                console.error('4a. Error message:', errorMsg);
                console.log(`Failed to disable download mode: ${errorMsg}\n\nPlease refresh the TikTok page and try again.`);
            }
            
            console.log('=== DISABLE DOWNLOAD MODE DEBUG END ===');
            
        } catch (error) {
            console.error('=== DISABLE DOWNLOAD MODE ERROR ===');
            console.error('Error disabling download mode:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            if (error.message.includes('Could not establish connection')) {
                console.log('Cannot connect to TikTok page. Please:\n1. Make sure you\'re on a TikTok page\n2. Refresh the page\n3. Try again');
            } else {
                console.log(`Error disabling download mode: ${error.message}\n\nPlease try again or refresh the page.`);
            }
            
            console.error('=== DISABLE DOWNLOAD MODE ERROR END ===');
        }
    }



    function openDownloadSettings() {
        // Switch to settings tab
        switchTab('settings');
    }

    async function toggleAutoStart() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                console.log('Please navigate to a TikTok page first');
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleAutoStart'
            });

            if (response && response.success) {
                console.log(response.message);
                updateAutoStartStatus(response.autoStart);
            } else {
                console.log('Failed to toggle auto-start');
            }
        } catch (error) {
            console.error('Error toggling auto-start:', error);
        }
    }

    async function updateAutoStartStatus(autoStart) {
        autoStartStatus.textContent = autoStart ? 'Enabled' : 'Disabled';
        autoStartStatus.style.color = autoStart ? '#28a745' : '#dc3545';
        autoStartToggle.textContent = autoStart ? 'Disable' : 'Enable';
        autoStartToggle.className = autoStart ? 'btn btn-small btn-danger' : 'btn btn-small btn-success';
    }

    async function loadDownloadModeStatus() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                return;
            }

            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'getDownloadModeStatus'
            });

            if (response && response.success) {
                const { downloadMode } = response;
                updateAutoStartStatus(downloadMode.autoStart);
                
                // Update download button status
                if (downloadMode.enabled) {
                    enableDownloadBtn.textContent = 'Download Mode Active';
                    enableDownloadBtn.classList.add('btn-success');
                } else {
                    enableDownloadBtn.textContent = 'Enable Download Mode';
                    enableDownloadBtn.classList.remove('btn-success');
                }
            }
        } catch (error) {
            console.error('Error loading download mode status:', error);
            // If we can't get the status, assume it's disabled
            enableDownloadBtn.textContent = 'Enable Download Mode';
            enableDownloadBtn.classList.remove('btn-success');
        }
    }

    async function saveSettings() {
        console.log('=== SAVE SETTINGS DEBUG START ===');
        
        const settings = {
            autoCheckAuth: autoCheckAuth.checked,
            showDownloadBtns: showDownloadBtns.checked,
            downloadQuality: downloadQuality.value,
            downloadMethod: downloadMethod.value
        };
        
        console.log('1. Settings object to save:', settings);
        console.log('2. Current form values:');
        console.log('   - autoCheckAuth.checked:', autoCheckAuth.checked);
        console.log('   - showDownloadBtns.checked:', showDownloadBtns.checked);
        console.log('   - downloadQuality.value:', downloadQuality.value);
        console.log('   - downloadMethod.value:', downloadMethod.value);

        try {
            console.log('3. Saving to chrome.storage.local...');
            await chrome.storage.local.set({ settings });
            console.log('4. Settings saved successfully!');
            console.log('5. Verifying saved settings...');
            
            // Verify the save
            const result = await chrome.storage.local.get(['settings']);
            console.log('6. Verification result:', result);
            
            if (result.settings && JSON.stringify(result.settings) === JSON.stringify(settings)) {
                console.log('7. Settings verification successful!');
            } else {
                console.warn('7. Settings verification failed - saved vs expected:');
                console.warn('   Saved:', result.settings);
                console.warn('   Expected:', settings);
            }
            
            console.log('=== SAVE SETTINGS DEBUG END ===');
        } catch (error) {
            console.error('=== SAVE SETTINGS ERROR ===');
            console.error('Error saving settings:', error);
            console.error('=== SAVE SETTINGS ERROR END ===');
        }
    }

    async function resetSettings() {
        if (true) { // Auto-confirm for better user experience
            // Reset to default values
            autoCheckAuth.checked = true;
            showDownloadBtns.checked = true;
            downloadQuality.value = 'medium';
            downloadMethod.value = 'api';

            
            // Save default settings
            await saveSettings();
        }
    }

    async function loadSettings() {
        console.log('=== LOAD SETTINGS DEBUG START ===');
        try {
            console.log('1. Loading settings from chrome.storage.local...');
            const result = await chrome.storage.local.get(['settings']);
            console.log('2. Raw storage result:', result);
            
            if (result.settings) {
                const settings = result.settings;
                console.log('3. Found settings:', settings);
                console.log('4. Setting form values...');
                
                autoCheckAuth.checked = settings.autoCheckAuth !== undefined ? settings.autoCheckAuth : true;
                showDownloadBtns.checked = settings.showDownloadBtns !== undefined ? settings.showDownloadBtns : true;
                downloadQuality.value = settings.downloadQuality || 'medium';
                downloadMethod.value = settings.downloadMethod || 'api';
                
                console.log('5. Form values set:');
                console.log('   - autoCheckAuth:', autoCheckAuth.checked);
                console.log('   - showDownloadBtns:', showDownloadBtns.checked);
                console.log('   - downloadQuality:', downloadQuality.value);
                console.log('   - downloadMethod:', downloadMethod.value);
            } else {
                console.log('3. No settings found, using defaults');
                console.log('4. Default values:');
                console.log('   - autoCheckAuth: true');
                console.log('   - showDownloadBtns: true');
                console.log('   - downloadQuality: medium');
                console.log('   - downloadMethod: api');
            }
            
            console.log('=== LOAD SETTINGS DEBUG END ===');
        } catch (error) {
            console.error('=== LOAD SETTINGS ERROR ===');
            console.error('Error loading settings:', error);
            console.error('=== LOAD SETTINGS ERROR END ===');
        }
    }

    // Check status every 5 seconds when popup is open
    const statusInterval = setInterval(checkAuthenticationStatus, 5000);
    
    // Clean up interval when popup is closed
    window.addEventListener('beforeunload', () => {
        clearInterval(statusInterval);
    });
});
