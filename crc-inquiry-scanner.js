// ==UserScript==
// @name         TUBOL INQUIRY SCANNER
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Standalone CRC inquiry scanner with unique inquiry IDs and same-bureau open-account matching
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
        scanButtonId: 'tubol-inquiry-scan-btn'
    };

    const STYLE = `
        #tubol-inquiry-panel {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 460px;
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

        #tubol-inquiry-panel .tubol-topbar {
            min-height: 58px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            box-sizing: border-box;
            background: #242526;
            border-bottom: 1px solid #3a3b3c;
        }

        #tubol-inquiry-panel .tubol-title {
            font-size: 15px;
            font-weight: 800;
        }

        #tubol-inquiry-panel .tubol-controls {
            display: flex;
            gap: 7px;
        }

        #tubol-inquiry-panel button {
            font-family: inherit;
        }

        #tubol-inquiry-panel .tubol-window-btn {
            width: 36px;
            height: 36px;
            border: 0;
            border-radius: 50%;
            background: #3a3b3c;
            color: #e4e6eb;
            cursor: pointer;
            font-size: 17px;
        }

        #tubol-inquiry-panel .tubol-window-btn:hover { background: #4e4f50; }
        #tubol-inquiry-panel .tubol-close:hover { background: #e81123; }

        #tubol-inquiry-panel .tubol-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            padding: 12px;
            background: #18191a;
            border-bottom: 1px solid #3a3b3c;
        }

        #tubol-inquiry-panel .tubol-stat {
            padding: 10px 8px;
            background: #242526;
            border: 1px solid #3a3b3c;
            border-radius: 8px;
            text-align: center;
        }

        #tubol-inquiry-panel .tubol-stat b {
            display: block;
            font-size: 16px;
        }

        #tubol-inquiry-panel .tubol-stat span {
            display: block;
            margin-top: 3px;
            color: #8f9397;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: .4px;
        }

        #tubol-inquiry-panel .tubol-tabs {
            display: flex;
            gap: 4px;
            padding: 6px 8px 0;
            background: #242526;
            border-bottom: 1px solid #3a3b3c;
        }

        #tubol-inquiry-panel .tubol-tab {
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

        #tubol-inquiry-panel .tubol-tab.active {
            color: #2d88ff;
            background: #18191a;
            box-shadow: inset 0 -3px #2d88ff;
        }

        #tubol-inquiry-panel .tubol-content {
            flex: 1;
            min-height: 0;
            overflow: auto;
            padding: 10px 14px 80px;
            background: #18191a;
        }

        #tubol-inquiry-panel .tubol-section {
            margin-bottom: 18px;
        }

        #tubol-inquiry-panel .tubol-section-title {
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

        #tubol-inquiry-panel .tubol-item {
            padding: 10px 12px;
            margin-bottom: 6px;
            border-radius: 8px;
            border: 1px solid transparent;
        }

        #tubol-inquiry-panel .tubol-item.connected {
            background: rgba(58,178,92,.10);
            border-color: rgba(58,178,92,.28);
        }

        #tubol-inquiry-panel .tubol-item.unconnected {
            background: rgba(224,82,82,.10);
            border-color: rgba(224,82,82,.28);
        }

        #tubol-inquiry-panel .tubol-item-head {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        #tubol-inquiry-panel .tubol-creditor {
            flex: 1;
            min-width: 0;
            font-size: 14px;
            font-weight: 700;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        #tubol-inquiry-panel .tubol-badge {
            flex-shrink: 0;
            min-width: 34px;
            padding: 3px 6px;
            border-radius: 6px;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            background: #3a3b3c;
        }

        #tubol-inquiry-panel .tubol-meta {
            margin-top: 4px;
            color: #8f9397;
            font-size: 11px;
        }

        #tubol-inquiry-panel .tubol-id {
            margin-top: 5px;
            color: #6f7174;
            font-size: 10px;
            word-break: break-all;
        }

        #tubol-inquiry-panel .tubol-copy-bar {
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

        #tubol-inquiry-panel .tubol-copy-btn,
        #tubol-inquiry-panel .tubol-main-scan {
            flex: 1;
            height: 40px;
            border: 0;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
        }

        #tubol-inquiry-panel .tubol-main-scan {
            background: #2374e1;
            color: white;
        }

        #tubol-inquiry-panel .tubol-copy-btn {
            background: #3a3b3c;
            color: #e4e6eb;
        }

        #tubol-inquiry-panel .tubol-empty {
            margin: 10px 0;
            padding: 28px 18px;
            border: 1px solid #3a3b3c;
            border-radius: 10px;
            background: #242526;
            color: #8f9397;
            text-align: center;
            font-size: 12px;
        }

        @media (max-width: 600px) {
            #tubol-inquiry-panel {
                top: 10px;
                right: 10px;
                width: calc(100vw - 20px);
                height: 90vh;
            }
        }
    `;

    function normalizeName(value) {
        return (value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    function namesMatch(a, b) {
        const left = normalizeName(a);
        const right = normalizeName(b);
        if (!left || !right) return false;
        return left === right || left.includes(right) || right.includes(left);
    }

    function parseDate(value) {
        if (!value) return null;
        const parts = value.split(/[\/\-]/).map(part => parseInt(part, 10));
        if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
        let [month, day, year] = parts;
        if (year < 100) year += year <= 69 ? 2000 : 1900;
        const date = new Date(year, month - 1, day);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function isRecent(item, days = CONFIG.recentDays) {
        const inquiryDate = parseDate(item.date);
        if (!inquiryDate) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - days);
        inquiryDate.setHours(0, 0, 0, 0);
        return inquiryDate >= cutoff && inquiryDate <= today;
    }

    function textValue(cell) {
        return (cell?.innerText || cell?.textContent || '').trim();
    }

    function getAccountNameFromGrid(grid) {
        const rows = Array.from(grid.querySelectorAll('.MuiDataGrid-row'));
        for (const row of rows) {
            const id = row.getAttribute('data-id') || '';
            if (!id.includes('Account #')) continue;
            return id.replace('summary_', '').split('---')[0].trim();
        }
        return '';
    }

    function extractOpenAccounts() {
        const byBureau = {
            experian: [],
            equifax: [],
            transunion: []
        };
        const all = [];
        const grids = document.querySelectorAll('.MuiDataGrid-root');

        grids.forEach(grid => {
            const headers = new Set(
                Array.from(grid.querySelectorAll('[role="columnheader"]'))
                    .map(header => header.getAttribute('data-field'))
                    .filter(Boolean)
            );

            if (!['experian', 'equifax', 'transunion'].some(key => headers.has(key))) return;

            const account = getAccountNameFromGrid(grid);
            if (!account) return;

            const rows = Array.from(grid.querySelectorAll('.MuiDataGrid-row'));
            const statusRow = rows.find(row => normalizeName(textValue(row.querySelector('[data-field="label"]'))) === 'account status');
            if (!statusRow) return;

            ['experian', 'equifax', 'transunion'].forEach(bureau => {
                const status = normalizeName(textValue(statusRow.querySelector(`[data-field="${bureau}"]`)));
                if (status !== 'open') return;
                const entry = { account, bureauKey: bureau };
                byBureau[bureau].push(entry);
                all.push(entry);
            });
        });

        return { all, byBureau };
    }

    function extractInquiries() {
        const results = [];
        const inquiryContainer = document.querySelector('[id*="inquir"]');
        if (!inquiryContainer) return results;

        inquiryContainer.querySelectorAll('.MuiDataGrid-root').forEach(grid => {
            const headers = new Set(
                Array.from(grid.querySelectorAll('[role="columnheader"]'))
                    .map(header => header.getAttribute('data-field'))
                    .filter(Boolean)
            );

            if (!['experian', 'equifax', 'transunion'].some(key => headers.has(key))) return;

            grid.querySelectorAll('.MuiDataGrid-row').forEach(row => {
                let creditor = '';
                let action = '';
                let date = '';
                const labelCell = row.querySelector('[data-field="label"]');
                const parentText = labelCell?.parentElement?.innerText || labelCell?.innerText || '';
                const lines = parentText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

                const actionPatterns = [
                    /click to dispute this inquiry/i,
                    /already disputed/i,
                    /click to view dispute/i,
                    /click to dispute/i
                ];
                const dateRegex = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;

                for (const line of lines) {
                    if (dateRegex.test(line)) continue;
                    const lower = line.toLowerCase();
                    if (['experian', 'equifax', 'transunion'].includes(lower)) continue;
                    if (actionPatterns.some(rx => rx.test(line))) {
                        action = line;
                        continue;
                    }
                    if (!creditor) creditor = line;
                }

                const rowText = textValue(row);
                const dateMatch = rowText.match(dateRegex);
                if (dateMatch) date = dateMatch[0];

                ['experian', 'equifax', 'transunion'].forEach(bureau => {
                    const cell = row.querySelector(`[data-field="${bureau}"]`);
                    const value = textValue(cell);
                    if (!value || value === '-' || value === '--' || !creditor) return;

                    const alreadyDisputed = /already disputed/i.test(action);
                    const idSeed = [bureau, normalizeName(creditor), date || value].join('|');

                    results.push({
                        id: `INQ-${stableHash(idSeed)}`,
                        creditor: creditor.trim(),
                        date,
                        action,
                        bureauKey: bureau,
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
            const key = [item.bureauKey, normalizeName(item.creditor), item.date, item.action].join('|');
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });
        return unique;
    }

    function stableHash(value) {
        let hash = 2166136261;
        for (let i = 0; i < value.length; i++) {
            hash ^= value.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
    }

    function enrichConnections(inquiries, openAccountsByBureau) {
        return inquiries.map(item => ({
            ...item,
            connectedToOpen: (openAccountsByBureau[item.bureauKey] || []).some(account => namesMatch(item.creditor, account.account))
        }));
    }

    function getCurrentGroups(items) {
        return [
            { title: 'EXPERIAN', bureauKey: 'experian', items: items.filter(i => i.bureauKey === 'experian') },
            { title: 'EQUIFAX', bureauKey: 'equifax', items: items.filter(i => i.bureauKey === 'equifax') },
            { title: 'TRANSUNION', bureauKey: 'transunion', items: items.filter(i => i.bureauKey === 'transunion') }
        ];
    }

    function ensurePanel() {
        document.getElementById(CONFIG.panelId)?.remove();
        const panel = document.createElement('div');
        panel.id = CONFIG.panelId;
        panel.innerHTML = `
            <div class="tubol-topbar">
                <div class="tubol-title">TUBOL-INQUIRY</div>
                <div class="tubol-controls">
                    <button class="tubol-window-btn tubol-minimize" title="Minimize">−</button>
                    <button class="tubol-window-btn tubol-close" title="Close">✕</button>
                </div>
            </div>
            <div class="tubol-stats">
                <div class="tubol-stat"><b data-stat="total">0</b><span>Total</span></div>
                <div class="tubol-stat"><b data-stat="unconnected">0</b><span>Unconnected</span></div>
                <div class="tubol-stat"><b data-stat="recent">0</b><span>Recent</span></div>
                <div class="tubol-stat"><b data-stat="disputed">0</b><span>Already Disputed</span></div>
            </div>
            <div class="tubol-tabs">
                <button class="tubol-tab active" data-tab="all">INQUIRIES</button>
                <button class="tubol-tab" data-tab="recent">NEW</button>
                <button class="tubol-tab" data-tab="open">OPEN ACCOUNTS</button>
            </div>
            <div class="tubol-content"></div>
            <div class="tubol-copy-bar">
                <button class="tubol-main-scan">SCAN</button>
                <button class="tubol-copy-btn">COPY</button>
            </div>
        `;
        document.body.appendChild(panel);
        return panel;
    }

    function render(panel, inquiries, openAccounts) {
        const content = panel.querySelector('.tubol-content');
        const activeTab = panel.querySelector('.tubol-tab.active')?.dataset.tab || 'all';

        panel.querySelector('[data-stat="total"]').textContent = inquiries.length;
        panel.querySelector('[data-stat="unconnected"]').textContent = inquiries.filter(i => !i.connectedToOpen).length;
        panel.querySelector('[data-stat="recent"]').textContent = inquiries.filter(i => isRecent(i)).length;
        panel.querySelector('[data-stat="disputed"]').textContent = inquiries.filter(i => i.alreadyDisputed).length;

        content.innerHTML = '';

        if (activeTab === 'open') {
            const groups = [
                { title: 'EXPERIAN', bureauKey: 'experian', items: openAccounts.byBureau.experian },
                { title: 'EQUIFAX', bureauKey: 'equifax', items: openAccounts.byBureau.equifax },
                { title: 'TRANSUNION', bureauKey: 'transunion', items: openAccounts.byBureau.transunion }
            ];
            groups.forEach(group => {
                const section = document.createElement('div');
                section.className = 'tubol-section';
                const title = document.createElement('div');
                title.className = 'tubol-section-title';
                title.textContent = `${group.title} (${group.items.length})`;
                section.appendChild(title);
                if (!group.items.length) {
                    const empty = document.createElement('div');
                    empty.className = 'tubol-empty';
                    empty.textContent = 'No open accounts found.';
                    section.appendChild(empty);
                } else {
                    group.items.forEach(item => {
                        const card = document.createElement('div');
                        card.className = 'tubol-item connected';
                        card.innerHTML = `<div class="tubol-item-head"><div class="tubol-creditor"></div><div class="tubol-badge">OPEN</div></div><div class="tubol-meta">${group.title}</div>`;
                        card.querySelector('.tubol-creditor').textContent = item.account;
                        section.appendChild(card);
                    });
                }
                content.appendChild(section);
            });
            return;
        }

        const source = activeTab === 'recent' ? inquiries.filter(i => isRecent(i)) : inquiries;
        getCurrentGroups(source).forEach(group => {
            const section = document.createElement('div');
            section.className = 'tubol-section';
            const title = document.createElement('div');
            title.className = 'tubol-section-title';
            title.textContent = `${group.title} (${group.items.length})`;
            section.appendChild(title);

            if (!group.items.length) {
                const empty = document.createElement('div');
                empty.className = 'tubol-empty';
                empty.textContent = activeTab === 'recent' ? 'No recent inquiries.' : 'No inquiries found.';
                section.appendChild(empty);
            } else {
                group.items.forEach(item => {
                    const card = document.createElement('div');
                    card.className = `tubol-item ${item.connectedToOpen ? 'connected' : 'unconnected'}`;
                    card.title = item.connectedToOpen ? 'Connected to OPEN account on same bureau' : 'Not connected to OPEN account on same bureau';
                    card.innerHTML = `
                        <div class="tubol-item-head">
                            <div class="tubol-creditor"></div>
                            <div class="tubol-badge">${item.alreadyDisputed ? 'AD' : 'ND'}</div>
                        </div>
                        <div class="tubol-meta">${item.date || 'Date unavailable'} · ${item.connectedToOpen ? 'CONNECTED' : 'UNCONNECTED'}</div>
                        <div class="tubol-id"></div>
                    `;
                    card.querySelector('.tubol-creditor').textContent = item.creditor;
                    card.querySelector('.tubol-id').textContent = item.id;
                    section.appendChild(card);
                });
            }
            content.appendChild(section);
        });
    }

    function copyText(inquiries, activeTab) {
        const source = activeTab === 'recent' ? inquiries.filter(isRecent) : inquiries;
        if (activeTab === 'open') return '';
        const unconnected = source.filter(item => !item.connectedToOpen);
        const groups = getCurrentGroups(unconnected);
        return groups.map(group => {
            const lines = group.items.map(item => `- ${item.creditor.toLowerCase()} ${item.date || ''}`.trim());
            return `${group.title}:\n${lines.length ? lines.join('\n') : '(No unconnected inquiries)'}`;
        }).join('\n\n');
    }

    function install() {
        if (!document.getElementById('tubol-inquiry-styles')) {
            const style = document.createElement('style');
            style.id = 'tubol-inquiry-styles';
            style.textContent = STYLE;
            document.head.appendChild(style);
        }

        let current = { inquiries: [], openAccounts: { all: [], byBureau: { experian: [], equifax: [], transunion: [] } } };
        const button = document.getElementById(CONFIG.scanButtonId) || document.createElement('button');
        button.id = CONFIG.scanButtonId;
        button.textContent = 'TUBOL INQUIRY';
        Object.assign(button.style, {
            position: 'fixed', right: '24px', bottom: '24px', zIndex: '999999',
            height: '44px', padding: '0 18px', border: '0', borderRadius: '9px',
            background: '#2374e1', color: '#fff', cursor: 'pointer', fontWeight: '800'
        });
        if (!button.parentElement) document.body.appendChild(button);

        button.onclick = async function () {
            button.disabled = true;
            const oldText = button.textContent;
            button.textContent = 'Scanning...';
            try {
                const openAccounts = extractOpenAccounts();
                const inquiries = enrichConnections(extractInquiries(), openAccounts.byBureau);
                current = { inquiries, openAccounts };
                const panel = ensurePanel();

                panel.querySelectorAll('.tubol-tab').forEach(tab => {
                    tab.onclick = () => {
                        panel.querySelectorAll('.tubol-tab').forEach(t => t.classList.toggle('active', t === tab));
                        render(panel, current.inquiries, current.openAccounts);
                    };
                });

                panel.querySelector('.tubol-close').onclick = () => panel.remove();
                panel.querySelector('.tubol-minimize').onclick = function () {
                    const minimized = panel.dataset.minimized === '1';
                    panel.dataset.minimized = minimized ? '0' : '1';
                    panel.querySelector('.tubol-stats').style.display = minimized ? '' : 'none';
                    panel.querySelector('.tubol-tabs').style.display = minimized ? '' : 'none';
                    panel.querySelector('.tubol-content').style.display = minimized ? '' : 'none';
                    panel.querySelector('.tubol-copy-bar').style.display = minimized ? '' : 'none';
                    this.textContent = minimized ? '−' : '+';
                };
                panel.querySelector('.tubol-main-scan').onclick = () => button.click();
                panel.querySelector('.tubol-copy-btn').onclick = async function () {
                    const activeTab = panel.querySelector('.tubol-tab.active')?.dataset.tab || 'all';
                    const text = copyText(current.inquiries, activeTab);
                    await navigator.clipboard.writeText(text);
                    const original = this.textContent;
                    this.textContent = 'COPIED';
                    setTimeout(() => this.textContent = original, 1200);
                };

                render(panel, inquiries, openAccounts);
            } catch (error) {
                console.error('[TUBOL-INQUIRY]', error);
            } finally {
                button.disabled = false;
                button.textContent = oldText;
            }
        };
    }

    install();
})();
