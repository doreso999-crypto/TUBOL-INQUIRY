// ==UserScript==
// @name         TUBOL INQUIRY SCANNER
// @namespace    http://tampermonkey.net/
// @version      1.1.0
// @description  Standalone CRC hard-inquiry scanner with unique inquiry IDs and bureau-specific open-account matching
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__tubolInquiryInstalled) return;
    window.__tubolInquiryInstalled = true;

    const CONFIG = {
        recentDays: 35,
        panelId: 'tubol-inquiry-panel',
        scanButtonId: 'tubol-inquiry-scan-btn',
        styleId: 'tubol-inquiry-styles'
    };

    const BUREAUS = [
        { key: 'experian', short: 'EX', label: 'EXPERIAN' },
        { key: 'equifax', short: 'EQU', label: 'EQUIFAX' },
        { key: 'transunion', short: 'TU', label: 'TRANSUNION' }
    ];

    const ACTION_PATTERNS = [
        /click\s+to\s+dispute\s+this\s+inquiry/i,
        /click\s+to\s+view\s+dispute/i,
        /click\s+to\s+dispute/i,
        /already\s+disputed/i
    ];

    const DATE_REGEX = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/;

    const STYLE = `
        #${CONFIG.panelId} {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 470px;
            height: 88vh;
            max-height: 88vh;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            overflow: hidden;
            background: #18191a;
            color: #e4e6eb;
            border: 1px solid #3a3b3c;
            border-radius: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            box-shadow: 0 12px 35px rgba(0,0,0,.45);
        }

        #${CONFIG.panelId} .ti-topbar {
            min-height: 58px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            box-sizing: border-box;
            background: #242526;
            border-bottom: 1px solid #3a3b3c;
        }

        #${CONFIG.panelId} .ti-title { font-size: 15px; font-weight: 800; }
        #${CONFIG.panelId} .ti-controls { display: flex; gap: 7px; }
        #${CONFIG.panelId} button { font-family: inherit; }
        #${CONFIG.panelId} .ti-window-btn {
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: #3a3b3c;
            color: #e4e6eb;
            cursor: pointer;
            font-size: 17px;
        }
        #${CONFIG.panelId} .ti-window-btn:hover { background: #4e4f50; }
        #${CONFIG.panelId} .ti-close:hover { background: #e81123; }

        #${CONFIG.panelId} .ti-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 12px;
            background: #18191a;
            border-bottom: 1px solid #3a3b3c;
        }
        #${CONFIG.panelId} .ti-stat {
            padding: 9px 7px;
            background: #242526;
            border: 1px solid #3a3b3c;
            border-radius: 8px;
            text-align: center;
        }
        #${CONFIG.panelId} .ti-stat b { display: block; font-size: 16px; }
        #${CONFIG.panelId} .ti-stat span {
            display: block;
            margin-top: 3px;
            color: #8f9397;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: .4px;
        }

        #${CONFIG.panelId} .ti-tabs {
            display: flex;
            gap: 4px;
            padding: 6px 8px 0;
            background: #242526;
            border-bottom: 1px solid #3a3b3c;
        }
        #${CONFIG.panelId} .ti-tab {
            flex: 1;
            height: 44px;
            background: transparent;
            border: 0;
            color: #b0b3b8;
            border-radius: 8px 8px 0 0;
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
        }
        #${CONFIG.panelId} .ti-tab.active {
            color: #2d88ff;
            background: #18191a;
            box-shadow: inset 0 -3px #2d88ff;
        }

        #${CONFIG.panelId} .ti-content {
            flex: 1;
            min-height: 0;
            overflow: auto;
            padding: 10px 14px 84px;
            background: #18191a;
        }
        #${CONFIG.panelId} .ti-status {
            margin: 2px 2px 10px;
            color: #8f9397;
            font-size: 11px;
            line-height: 1.45;
        }
        #${CONFIG.panelId} .ti-section { margin-bottom: 18px; }
        #${CONFIG.panelId} .ti-section-title {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8px 4px 10px;
            color: #2d88ff;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            cursor: pointer;
        }
        #${CONFIG.panelId} .ti-item {
            padding: 10px 12px;
            margin-bottom: 6px;
            border-radius: 8px;
            border: 1px solid transparent;
        }
        #${CONFIG.panelId} .ti-item.connected {
            background: rgba(58,178,92,.10);
            border-color: rgba(58,178,92,.28);
        }
        #${CONFIG.panelId} .ti-item.unconnected {
            background: rgba(224,82,82,.10);
            border-color: rgba(224,82,82,.28);
        }
        #${CONFIG.panelId} .ti-head { display: flex; gap: 8px; align-items: center; }
        #${CONFIG.panelId} .ti-creditor {
            flex: 1;
            min-width: 0;
            font-size: 14px;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        #${CONFIG.panelId} .ti-badge {
            flex-shrink: 0;
            min-width: 38px;
            padding: 3px 6px;
            border-radius: 6px;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            background: #3a3b3c;
        }
        #${CONFIG.panelId} .ti-meta { margin-top: 4px; color: #8f9397; font-size: 11px; }
        #${CONFIG.panelId} .ti-id { margin-top: 5px; color: #6f7174; font-size: 10px; }
        #${CONFIG.panelId} .ti-empty {
            margin: 10px 0;
            padding: 28px 18px;
            border: 1px solid #3a3b3c;
            border-radius: 10px;
            background: #242526;
            color: #8f9397;
            text-align: center;
            font-size: 12px;
        }
        #${CONFIG.panelId} .ti-open-card {
            padding: 10px 12px;
            margin-bottom: 6px;
            border-radius: 8px;
            border: 1px solid #3a3b3c;
            background: #242526;
        }
        #${CONFIG.panelId} .ti-open-card.negative {
            background: #3a2426;
            border-color: #8f3a40;
        }
        #${CONFIG.panelId} .ti-copybar {
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            gap: 8px;
            padding: 12px 14px;
            background: #242526;
            border-top: 1px solid #3a3b3c;
        }
        #${CONFIG.panelId} .ti-copy,
        #${CONFIG.panelId} .ti-scan {
            flex: 1;
            height: 40px;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
        }
        #${CONFIG.panelId} .ti-scan { background: #2374e1; color: #fff; }
        #${CONFIG.panelId} .ti-copy { background: #3a3b3c; color: #e4e6eb; }
        #${CONFIG.panelId} .ti-scan:hover { background: #3982e4; }
        #${CONFIG.panelId} .ti-copy:hover { background: #4e4f50; }
        #${CONFIG.scanButtonId} {
            position: fixed;
            right: 24px;
            bottom: 24px;
            z-index: 999998;
            min-height: 44px;
            padding: 0 18px;
            border: 0;
            border-radius: 9px;
            cursor: pointer;
            background: #2374e1;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 13px;
            font-weight: 800;
            box-shadow: 0 6px 18px rgba(0,0,0,.3);
        }
        @media (max-width: 600px) {
            #${CONFIG.panelId} {
                top: 10px;
                right: 10px;
                width: calc(100vw - 20px);
                height: 90vh;
            }
            #${CONFIG.scanButtonId} { right: 12px; bottom: 12px; }
        }
    `;

    function normalizeName(value) {
        return (value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function textValue(element) {
        return (element?.innerText || element?.textContent || '').trim();
    }

    function isPlaceholder(value) {
        const v = (value || '').trim();
        return !v || v === '-' || v === '--' || v === '—';
    }

    function parseDate(value) {
        if (!value) return null;
        const parts = value.split(/[\/\-]/).map(v => parseInt(v, 10));
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        let [month, day, year] = parts;
        if (year < 100) year += year <= 69 ? 2000 : 1900;
        const date = new Date(year, month - 1, day);
        if (Number.isNaN(date.getTime())) return null;
        if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
        return date;
    }

    function isRecent(item, days = CONFIG.recentDays) {
        const d = parseDate(item.date);
        if (!d) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);
        d.setHours(0, 0, 0, 0);
        return d >= cutoff && d <= today;
    }

    function stableHash(value) {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }

    function getGridHeaders(grid) {
        return new Set(
            Array.from(grid.querySelectorAll('[role="columnheader"]'))
                .map(node => node.getAttribute('data-field'))
                .filter(Boolean)
        );
    }

    function getRows(grid) {
        return Array.from(grid.querySelectorAll('.MuiDataGrid-row'));
    }

    function getRowLabel(row) {
        return normalizeName(textValue(row.querySelector('[data-field="label"]')));
    }

    function gridLooksLikeInquiryGrid(grid) {
        const headers = getGridHeaders(grid);
        if (!BUREAUS.some(b => headers.has(b.key))) return false;

        const idText = [grid.id, grid.parentElement?.id, grid.parentElement?.parentElement?.id]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

        if (/inquir/.test(idText)) return true;

        const gridText = textValue(grid);
        if (ACTION_PATTERNS.some(rx => rx.test(gridText))) return true;

        const rows = getRows(grid);
        for (const row of rows) {
            const rowText = textValue(row);
            if (ACTION_PATTERNS.some(rx => rx.test(rowText))) return true;
        }

        // CRC inquiry grids commonly have a label row containing a date
        // and a bureau cell, without account-detail rows such as Account Status.
        const hasAccountDetailRow = rows.some(row => {
            const label = getRowLabel(row);
            return label === 'account status' || label === 'account ' || label === 'balance' || label === 'balance owed';
        });
        if (hasAccountDetailRow) return false;

        const hasDate = DATE_REGEX.test(gridText);
        const hasBureauValues = rows.some(row => BUREAUS.some(b => !isPlaceholder(textValue(row.querySelector(`[data-field="${b.key}"]`)))));
        return hasDate && hasBureauValues;
    }

    function extractCreditorDateAction(row) {
        const labelCell = row.querySelector('[data-field="label"]');
        const labelText = textValue(labelCell);
        const parentText = labelCell?.parentElement?.innerText || labelText || '';
        const lines = parentText.split(/\r?\n/).map(v => v.trim()).filter(Boolean);

        let creditor = '';
        let date = '';
        let action = '';

        for (const line of lines) {
            const dateMatch = line.match(DATE_REGEX);
            if (dateMatch && !date) date = dateMatch[0];
            if (ACTION_PATTERNS.some(rx => rx.test(line))) {
                action = action || line;
                continue;
            }
            const normalized = normalizeName(line);
            if (BUREAUS.some(b => normalized === b.key) || normalized === 'hard inquiry' || normalized === 'inquiry') continue;
            if (DATE_REGEX.test(line)) continue;
            if (!creditor && line.length > 0) creditor = line;
        }

        const rowText = textValue(row);
        if (!date) {
            const match = rowText.match(DATE_REGEX);
            if (match) date = match[0];
        }
        if (!action) {
            const match = ACTION_PATTERNS.find(rx => rx.test(rowText));
            if (match) {
                const found = rowText.match(match);
                if (found) action = found[0];
            }
        }

        // Fallback: use the label cell itself as creditor when the parent
        // contains nested elements/virtualized text not represented as lines.
        if (!creditor && labelText && !DATE_REGEX.test(labelText) && !ACTION_PATTERNS.some(rx => rx.test(labelText))) {
            const normalized = normalizeName(labelText);
            if (!BUREAUS.some(b => normalized === b.key)) creditor = labelText;
        }

        return { creditor: creditor.trim(), date, action };
    }

    function extractOpenAccounts() {
        const byBureau = { experian: [], equifax: [], transunion: [] };
        const all = [];

        document.querySelectorAll('.MuiDataGrid-root').forEach(grid => {
            if (gridLooksLikeInquiryGrid(grid)) return;
            const headers = getGridHeaders(grid);
            if (!BUREAUS.some(b => headers.has(b.key))) return;

            const rows = getRows(grid);
            let accountName = '';

            for (const row of rows) {
                const id = row.getAttribute('data-id') || '';
                if (id.includes('Account #')) {
                    accountName = id.replace('summary_', '').split('---')[0].trim();
                    break;
                }
            }
            if (!accountName) return;

            const statusRow = rows.find(row => getRowLabel(row) === 'account status');
            if (!statusRow) return;

            BUREAUS.forEach(bureau => {
                const status = normalizeName(textValue(statusRow.querySelector(`[data-field="${bureau.key}"]`)));
                if (status !== 'open') return;
                const entry = { account: accountName, bureauKey: bureau.key };
                byBureau[bureau.key].push(entry);
                all.push(entry);
            });
        });

        return { all, byBureau };
    }

    function extractInquiries() {
        const results = [];
        const grids = Array.from(document.querySelectorAll('.MuiDataGrid-root'));
        const candidateGrids = grids.filter(gridLooksLikeInquiryGrid);

        candidateGrids.forEach(grid => {
            getRows(grid).forEach(row => {
                const { creditor, date, action } = extractCreditorDateAction(row);
                if (!creditor) return;

                BUREAUS.forEach(bureau => {
                    const value = textValue(row.querySelector(`[data-field="${bureau.key}"]`));
                    if (isPlaceholder(value)) return;

                    const alreadyDisputed = /already\s+disputed/i.test(action);
                    const identity = [
                        bureau.key,
                        normalizeName(creditor),
                        date || value
                    ].join('|');

                    results.push({
                        id: `INQ-${stableHash(identity)}`,
                        creditor,
                        date,
                        action,
                        bureauKey: bureau.key,
                        bureauLabel: bureau.label,
                        bureauShort: bureau.short,
                        alreadyDisputed,
                        rawValue: value,
                        connectedToOpen: false
                    });
                });
            });
        });

        const unique = [];
        const seen = new Set();
        results.forEach(item => {
            const key = [
                item.bureauKey,
                normalizeName(item.creditor),
                item.date,
                normalizeName(item.action)
            ].join('|');
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });

        unique.sort((a, b) => {
            const da = parseDate(a.date)?.getTime() || 0;
            const db = parseDate(b.date)?.getTime() || 0;
            return db - da;
        });

        return unique;
    }

    function enrichConnections(inquiries, openAccountsByBureau) {
        return inquiries.map(item => ({
            ...item,
            connectedToOpen: (openAccountsByBureau[item.bureauKey] || [])
                .some(account => {
                    const a = normalizeName(item.creditor);
                    const b = normalizeName(account.account);
                    return !!a && !!b && (a === b || a.includes(b) || b.includes(a));
                })
        }));
    }

    function createPanel() {
        document.getElementById(CONFIG.panelId)?.remove();

        const panel = document.createElement('div');
        panel.id = CONFIG.panelId;
        panel.innerHTML = `
            <div class="ti-topbar">
                <div class="ti-title">TUBOL INQUIRY</div>
                <div class="ti-controls">
                    <button class="ti-window-btn ti-minimize" title="Minimize">−</button>
                    <button class="ti-window-btn ti-close" title="Close">✕</button>
                </div>
            </div>
            <div class="ti-stats">
                <div class="ti-stat"><b data-total>0</b><span>Total</span></div>
                <div class="ti-stat"><b data-unconnected>0</b><span>Unconnected</span></div>
                <div class="ti-stat"><b data-connected>0</b><span>Connected</span></div>
                <div class="ti-stat"><b data-new>0</b><span>New</span></div>
            </div>
            <div class="ti-tabs">
                <button class="ti-tab active" data-view="all">ALL</button>
                <button class="ti-tab" data-view="unconnected">UNCONNECTED</button>
                <button class="ti-tab" data-view="new">NEW</button>
                <button class="ti-tab" data-view="open">OPEN ACCOUNTS</button>
            </div>
            <div class="ti-content">
                <div class="ti-status" data-status>Ready to scan CRC.</div>
                <div data-results></div>
            </div>
            <div class="ti-copybar">
                <button class="ti-scan" data-scan>SCAN</button>
                <button class="ti-copy" data-copy>COPY</button>
            </div>
        `;

        document.body.appendChild(panel);
        return panel;
    }

    function render(panel, inquiries, openAccounts) {
        const results = panel.querySelector('[data-results]');
        const status = panel.querySelector('[data-status]');
        results.innerHTML = '';

        const newItems = inquiries.filter(item => isRecent(item));
        const unconnectedItems = inquiries.filter(item => !item.connectedToOpen);
        const connectedItems = inquiries.filter(item => item.connectedToOpen);

        panel.querySelector('[data-total]').textContent = inquiries.length;
        panel.querySelector('[data-unconnected]').textContent = unconnectedItems.length;
        panel.querySelector('[data-connected]').textContent = connectedItems.length;
        panel.querySelector('[data-new]').textContent = newItems.length;
        status.textContent = `Found ${inquiries.length} inquiries across ${new Set(inquiries.map(i => i.bureauKey)).size} bureau(s).`;

        const state = { view: 'all' };
        let currentCopy = '';

        function groupsForView(view) {
            if (view === 'unconnected') return unconnectedItems;
            if (view === 'new') return newItems;
            return inquiries;
        }

        function renderInquiryGroups(items) {
            results.innerHTML = '';
            currentCopy = '';

            if (!items.length) {
                const empty = document.createElement('div');
                empty.className = 'ti-empty';
                empty.textContent = 'No inquiries found for this view.';
                results.appendChild(empty);
                return;
            }

            BUREAUS.forEach(bureau => {
                const bureauItems = items.filter(item => item.bureauKey === bureau.key);
                const section = document.createElement('div');
                section.className = 'ti-section';

                const title = document.createElement('div');
                title.className = 'ti-section-title';
                title.innerHTML = `<span>${bureau.label} (${bureauItems.length})</span><span>▾</span>`;
                const body = document.createElement('div');
                title.addEventListener('click', () => {
                    body.hidden = !body.hidden;
                    title.lastElementChild.textContent = body.hidden ? '▸' : '▾';
                });

                if (!bureauItems.length) {
                    const none = document.createElement('div');
                    none.className = 'ti-meta';
                    none.textContent = 'No inquiries';
                    body.appendChild(none);
                } else {
                    bureauItems.forEach(item => {
                        const card = document.createElement('div');
                        card.className = `ti-item ${item.connectedToOpen ? 'connected' : 'unconnected'}`;
                        card.title = item.connectedToOpen ? 'Connected to Open Account' : 'Not Connected to Open Account';

                        const head = document.createElement('div');
                        head.className = 'ti-head';
                        const creditor = document.createElement('div');
                        creditor.className = 'ti-creditor';
                        creditor.textContent = item.creditor;
                        const badge = document.createElement('div');
                        badge.className = 'ti-badge';
                        badge.textContent = item.alreadyDisputed ? 'AD' : 'ND';
                        head.appendChild(creditor);
                        head.appendChild(badge);

                        const meta = document.createElement('div');
                        meta.className = 'ti-meta';
                        meta.textContent = `${item.date || 'No date'} • ${item.connectedToOpen ? 'Connected to OPEN account' : 'Not connected to OPEN account'}`;

                        const id = document.createElement('div');
                        id.className = 'ti-id';
                        id.textContent = item.id;

                        card.appendChild(head);
                        card.appendChild(meta);
                        card.appendChild(id);
                        body.appendChild(card);

                        if (!item.connectedToOpen) {
                            currentCopy += `${bureau.label}: ${item.creditor} ${item.date || ''} [${item.id}]\n`;
                        }
                    });
                }

                section.appendChild(title);
                section.appendChild(body);
                results.appendChild(section);
            });

            currentCopy = currentCopy.trim();
        }

        function renderOpenAccounts() {
            results.innerHTML = '';
            currentCopy = '';
            if (!openAccounts.length) {
                const empty = document.createElement('div');
                empty.className = 'ti-empty';
                empty.textContent = 'No open accounts found.';
                results.appendChild(empty);
                return;
            }

            BUREAUS.forEach(bureau => {
                const items = openAccounts.filter(item => item.bureauKey === bureau.key);
                if (!items.length) return;

                const section = document.createElement('div');
                section.className = 'ti-section';
                const title = document.createElement('div');
                title.className = 'ti-section-title';
                title.textContent = `${bureau.label} (${items.length})`;
                const body = document.createElement('div');

                items.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'ti-open-card';
                    card.textContent = item.account;
                    body.appendChild(card);
                    currentCopy += `${bureau.label}: ${item.account}\n`;
                });

                section.appendChild(title);
                section.appendChild(body);
                results.appendChild(section);
            });

            currentCopy = currentCopy.trim();
        }

        function applyView(view) {
            state.view = view;
            panel.querySelectorAll('.ti-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view));
            if (view === 'open') renderOpenAccounts();
            else renderInquiryGroups(groupsForView(view));
        }

        panel.querySelectorAll('.ti-tab').forEach(tab => {
            tab.addEventListener('click', () => applyView(tab.dataset.view));
        });

        panel.querySelector('.ti-copy').addEventListener('click', async function () {
            try {
                await navigator.clipboard.writeText(currentCopy || '');
                const old = this.textContent;
                this.textContent = '✓ COPIED';
                setTimeout(() => { this.textContent = old; }, 1200);
            } catch (error) {
                console.error('TUBOL-INQUIRY copy failed', error);
            }
        });

        applyView(state.view);
    }

    function scan(panel) {
        const status = panel.querySelector('[data-status]');
        status.textContent = 'Scanning CRC inquiry tables...';

        const openAccountsData = extractOpenAccounts();
        const rawInquiries = extractInquiries();
        const inquiries = enrichConnections(rawInquiries, openAccountsData.byBureau);

        render(panel, inquiries, openAccountsData.all);

        if (!inquiries.length) {
            panel.querySelector('[data-status]').textContent =
                'No inquiries detected. CRC may still be virtualizing the table; scroll the inquiry section once and scan again.';
        }
    }

    function addStyles() {
        if (document.getElementById(CONFIG.styleId)) return;
        const style = document.createElement('style');
        style.id = CONFIG.styleId;
        style.textContent = STYLE;
        document.head.appendChild(style);
    }

    addStyles();

    let panel = createPanel();

    const scanButton = document.getElementById(CONFIG.scanButtonId) || document.createElement('button');
    scanButton.id = CONFIG.scanButtonId;
    scanButton.textContent = 'TUBOL INQUIRY';
    document.body.appendChild(scanButton);

    const performScan = () => {
        panel = document.getElementById(CONFIG.panelId) || createPanel();
        scan(panel);
    };

    scanButton.onclick = performScan;
    panel.querySelector('[data-scan]').onclick = performScan;

    panel.querySelector('.ti-close').onclick = () => {
        panel.remove();
    };

    panel.querySelector('.ti-minimize').onclick = () => {
        const content = panel.querySelector('.ti-content');
        const stats = panel.querySelector('.ti-stats');
        const tabs = panel.querySelector('.ti-tabs');
        const copybar = panel.querySelector('.ti-copybar');
        const minimized = panel.dataset.minimized === '1';
        [content, stats, tabs, copybar].forEach(el => { el.style.display = minimized ? '' : 'none'; });
        panel.dataset.minimized = minimized ? '0' : '1';
        panel.querySelector('.ti-minimize').textContent = minimized ? '−' : '+';
    };
})();
