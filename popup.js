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
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url || !tab.url.includes('tiktok.com')) {
                alert('Please navigate to a TikTok page first');
                return;
            }

            // Send message to content script to enable download mode
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'enableDownloadMode',
                options: {
                    watermark: watermarkOption.checked,
                    audio: audioOption.checked,
                    quality: downloadQuality.value
                }
            });

            if (response && response.success) {
                enableDownloadBtn.textContent = 'Download Mode Active';
                enableDownloadBtn.classList.add('btn-success');
                alert('Download mode enabled! Download buttons will appear on TikTok posts.');
            } else {
                alert('Failed to enable download mode. Please refresh the TikTok page and try again.');
            }
        } catch (error) {
            console.error('Error enabling download mode:', error);
            alert('Error enabling download mode. Please try again.');
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
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Error saving settings. Please try again.');
        }
    }

    async function resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
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
