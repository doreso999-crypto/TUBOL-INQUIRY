// TUBOL-INQUIRY bootstrap wrapper (v1.4.0)
// Loads the preserved v1.3 scanner without browser-cache issues, then enforces the launcher/UI fixes.
(async function () {
    'use strict';

    const CORE_URL = 'https://raw.githubusercontent.com/doreso999-crypto/TUBOL-INQUIRY/main/core/tubol-inquiry-v1.3.js';
    const cacheBust = `?v=${Date.now()}`;

    try {
        const response = await fetch(CORE_URL + cacheBust, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Core load failed: HTTP ${response.status}`);
        const code = await response.text();
        (0, eval)(code);
    } catch (error) {
        console.error('[TUBOL-INQUIRY] Failed to load core scanner', error);
        return;
    }

    function enforceLauncherPosition() {
        const button = document.getElementById('tubol-inquiry-scan-btn');
        if (!button) return false;

        button.style.setProperty('position', 'fixed', 'important');
        button.style.setProperty('left', '20px', 'important');
        button.style.setProperty('right', 'auto', 'important');
        button.style.setProperty('bottom', '20px', 'important');
        button.style.setProperty('top', 'auto', 'important');
        button.style.setProperty('z-index', '2147483646', 'important');
        button.style.setProperty('min-width', '150px', 'important');
        button.style.setProperty('height', '46px', 'important');
        return true;
    }

    function patchPanelControls() {
        const panel = document.getElementById('tubol-inquiry-panel');
        if (!panel) return false;

        panel.style.setProperty('right', '20px', 'important');
        panel.style.setProperty('left', 'auto', 'important');
        panel.style.setProperty('top', '20px', 'important');
        panel.style.setProperty('z-index', '2147483645', 'important');

        const min = panel.querySelector('.ti-min');
        if (min && !min.dataset.tubolPatched) {
            min.dataset.tubolPatched = '1';
            min.addEventListener('click', () => {
                requestAnimationFrame(() => {
                    if (panel.classList.contains('minimized')) {
                        panel.style.setProperty('width', '320px', 'important');
                        panel.style.setProperty('height', '58px', 'important');
                        panel.style.setProperty('max-height', '58px', 'important');
                    } else {
                        panel.style.setProperty('width', '500px', 'important');
                        panel.style.setProperty('height', '86vh', 'important');
                        panel.style.setProperty('max-height', '86vh', 'important');
                    }
                });
            }, true);
        }

        return true;
    }

    function applyUIFixes() {
        enforceLauncherPosition();
        patchPanelControls();
    }

    applyUIFixes();

    const observer = new MutationObserver(() => applyUIFixes());
    observer.observe(document.body, { childList: true, subtree: true });

    window.setTimeout(() => observer.disconnect(), 15000);
    console.info('[TUBOL-INQUIRY] UI fixes enforced');
})();
