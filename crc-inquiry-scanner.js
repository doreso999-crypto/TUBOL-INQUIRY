// ==UserScript==
// @name         TUBOL INQUIRY SCANNER
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Standalone CRC hard-inquiry scanner with bureau-aware status, unique IDs, and open-account matching
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__tubolInquiryInstalled) return;
    window.__tubolInquiryInstalled = true;

    const CFG = {
        panelId: 'tubol-inquiry-panel',
        scanButtonId: 'tubol-inquiry-scan-btn',
        recentDays: 35,
        stylesId: 'tubol-inquiry-styles'
    };

    const BUREAUS = [
        { key: 'experian', short: 'EX', label: 'EXPERIAN' },
        { key: 'equifax', short: 'EQU', label: 'EQUIFAX' },
        { key: 'transunion', short: 'TU', label: 'TRANSUNION' }
    ];

    const CSS = `
#${CFG.panelId}{position:fixed;top:20px;right:20px;width:470px;height:88vh;max-height:88vh;z-index:999999;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;background:#18191a;color:#e4e6eb;border:1px solid #3a3b3c;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 12px 35px rgba(0,0,0,.45)}
#${CFG.panelId} .ti-top{min-height:58px;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;box-sizing:border-box;background:#242526;border-bottom:1px solid #3a3b3c}
#${CFG.panelId} .ti-title{font-size:15px;font-weight:800}
#${CFG.panelId} .ti-controls{display:flex;gap:7px}
#${CFG.panelId} button{font:inherit}
#${CFG.panelId} .ti-window{width:36px;height:36px;border:0;border-radius:50%;background:#3a3b3c;color:#e4e6eb;cursor:pointer;font-size:17px}
#${CFG.panelId} .ti-window:hover{background:#4e4f50}
#${CFG.panelId} .ti-close:hover{background:#e81123}
#${CFG.panelId} .ti-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;background:#18191a;border-bottom:1px solid #3a3b3c}
#${CFG.panelId} .ti-stat{padding:9px 7px;background:#242526;border:1px solid #3a3b3c;border-radius:8px;text-align:center}
#${CFG.panelId} .ti-stat b{display:block;font-size:16px}
#${CFG.panelId} .ti-stat span{display:block;margin-top:3px;color:#8f9397;font-size:9px;text-transform:uppercase;letter-spacing:.4px}
#${CFG.panelId} .ti-tabs{display:flex;gap:4px;padding:6px 8px 0;background:#242526;border-bottom:1px solid #3a3b3c}
#${CFG.panelId} .ti-tab{flex:1;height:44px;background:transparent;border:0;color:#b0b3b8;border-radius:8px 8px 0 0;cursor:pointer;font-size:12px;font-weight:800}
#${CFG.panelId} .ti-tab.active{color:#2d88ff;background:#18191a;box-shadow:inset 0 -3px #2d88ff}
#${CFG.panelId} .ti-content{position:relative;flex:1;min-height:0;overflow:auto;padding:10px 14px 82px;background:#18191a}
#${CFG.panelId} .ti-section{margin-bottom:18px}
#${CFG.panelId} .ti-section-title{display:flex;justify-content:space-between;align-items:center;margin:8px 4px 10px;color:#2d88ff;font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;user-select:none}
#${CFG.panelId} .ti-items{display:block}
#${CFG.panelId} .ti-section.collapsed .ti-items{display:none}
#${CFG.panelId} .ti-item{padding:11px 12px;margin-bottom:7px;border-radius:9px;border:1px solid transparent}
#${CFG.panelId} .ti-item.connected{background:rgba(58,178,92,.10);border-color:rgba(58,178,92,.28)}
#${CFG.panelId} .ti-item.unconnected{background:rgba(224,82,82,.10);border-color:rgba(224,82,82,.28)}
#${CFG.panelId} .ti-item.disputed{opacity:.72}
#${CFG.panelId} .ti-head{display:flex;gap:8px;align-items:center}
#${CFG.panelId} .ti-creditor{flex:1;min-width:0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${CFG.panelId} .ti-badge{flex-shrink:0;padding:3px 6px;border-radius:6px;background:#3a3b3c;font-size:10px;font-weight:800}
#${CFG.panelId} .ti-meta{margin-top:5px;color:#9a9da1;font-size:11px;line-height:1.45}
#${CFG.panelId} .ti-id{margin-top:5px;color:#6f7174;font-size:10px;word-break:break-all}
#${CFG.panelId} .ti-empty{margin:10px 0;padding:26px 18px;background:#242526;border:1px solid #3a3b3c;border-radius:10px;color:#8f9397;text-align:center;font-size:12px}
#${CFG.panelId} .ti-footer{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;padding:12px 14px;background:#242526;border-top:1px solid #3a3b3c}
#${CFG.panelId} .ti-footer button{flex:1;height:40px;border:0;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800}
#${CFG.panelId} .ti-scan{background:#2374e1;color:#fff}
#${CFG.panelId} .ti-copy{background:#3a3b3c;color:#e4e6eb}
#${CFG.panelId} .ti-note{margin:0 3px 10px;color:#8f9397;font-size:10px;line-height:1.5;text-align:center}
@media(max-width:600px){#${CFG.panelId}{top:10px;right:10px;width:calc(100vw - 20px);height:90vh}}
`;

    function normalize(value) {
        return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function namesMatch(a, b) {
        const x = normalize(a), y = normalize(b);
        return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
    }

    function text(el) {
        return (el?.innerText || el?.textContent || '').trim();
    }

    function stableHash(value) {
        let h = 2166136261;
        for (let i = 0; i < value.length; i++) {
            h ^= value.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0).toString(16).toUpperCase().padStart(8, '0');
    }

    function parseDate(value) {
        const m = String(value || '').match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        if (!m) return null;
        let year = Number(m[3]);
        if (year < 100) year += year <= 69 ? 2000 : 1900;
        const d = new Date(year, Number(m[1]) - 1, Number(m[2]));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    function isRecent(item) {
        const d = parseDate(item.date);
        if (!d) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(today);
        cutoff.setDate(cutoff.getDate() - CFG.recentDays);
        d.setHours(0, 0, 0, 0);
        return d >= cutoff && d <= today;
    }

    function isAlreadyDisputed(value) {
        return /already\s+disputed/i.test(value || '');
    }

    function isInquiryAction(value) {
        return /click\s+to\s+(dispute|view\s+dispute)/i.test(value || '') || isAlreadyDisputed(value);
    }

    function extractLabel(row) {
        const cell = row.querySelector('[data-field="label"]');
        const raw = text(cell);
        if (!raw) return { creditor: '', date: '' };

        const dateMatch = raw.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
        const date = dateMatch ? dateMatch[0] : '';

        let creditor = raw;
        if (dateMatch) creditor = raw.slice(0, dateMatch.index).trim();
        creditor = creditor.replace(/\s*:\s*$/, '').trim();
        creditor = creditor.split(/\r?\n/).map(s => s.trim()).filter(Boolean).join(' ');

        return { creditor, date };
    }

    function looksLikeInquiryGrid(grid) {
        const root = grid.closest('#div-preview-credit-inquiries');
        if (root) return true;

        const firstRows = Array.from(grid.querySelectorAll('.MuiDataGrid-row')).slice(0, 5);
        return firstRows.some(row => /^Inquiries-/i.test(row.getAttribute('data-id') || ''));
    }

    function extractInquiries() {
        const results = [];
        const exactContainer = document.getElementById('div-preview-credit-inquiries');
        const grids = exactContainer
            ? exactContainer.querySelectorAll('.MuiDataGrid-root')
            : document.querySelectorAll('.MuiDataGrid-root');

        grids.forEach(grid => {
            if (!looksLikeInquiryGrid(grid)) return;

            const headers = new Set(
                Array.from(grid.querySelectorAll('[role="columnheader"]'))
                    .map(h => h.getAttribute('data-field'))
                    .filter(Boolean)
            );

            const hasBureauColumns = BUREAUS.some(b => headers.has(b.key));
            if (!hasBureauColumns) return;

            grid.querySelectorAll('.MuiDataGrid-row').forEach((row, rowIndex) => {
                const rowId = row.getAttribute('data-id') || `row-${rowIndex}`;
                if (!/^Inquiries-/i.test(rowId) && exactContainer) return;

                const { creditor, date } = extractLabel(row);
                if (!creditor) return;

                BUREAUS.forEach(bureau => {
                    const cell = row.querySelector(`[data-field="${bureau.key}"]`);
                    if (!cell) return;

                    const cellText = text(cell);
                    const hasDomContent = cell.children.length > 0;
                    const present = !!cellText || hasDomContent;
                    if (!present) return;

                    const alreadyDisputed = isAlreadyDisputed(cellText);
                    const action = cellText || (hasDomContent ? 'Reported' : '');
                    const seed = [
                        rowId,
                        bureau.key,
                        normalize(creditor),
                        date
                    ].join('|');

                    results.push({
                        id: `INQ-${stableHash(seed)}`,
                        rowId,
                        creditor,
                        date,
                        bureauKey: bureau.key,
                        bureauLabel: bureau.label,
                        bureauShort: bureau.short,
                        action,
                        alreadyDisputed,
                        connectedToOpen: false
                    });
                });
            });
        });

        const unique = [];
        const seen = new Set();
        results.forEach(item => {
            const key = [item.bureauKey, normalize(item.creditor), item.date].join('|');
            if (seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });

        return unique;
    }

    function extractOpenAccounts() {
        const byBureau = { experian: [], equifax: [], transunion: [] };
        const grids = document.querySelectorAll('.MuiDataGrid-root');

        grids.forEach(grid => {
            if (grid.closest('#div-preview-credit-inquiries')) return;

            const headers = new Set(
                Array.from(grid.querySelectorAll('[role="columnheader"]'))
                    .map(h => h.getAttribute('data-field'))
                    .filter(Boolean)
            );
            if (!BUREAUS.some(b => headers.has(b.key))) return;

            const rows = Array.from(grid.querySelectorAll('.MuiDataGrid-row'));
            const accountRow = rows.find(row => (row.getAttribute('data-id') || '').includes('Account #'));
            if (!accountRow) return;

            const accountName = (accountRow.getAttribute('data-id') || '')
                .replace(/^summary_/i, '')
                .split('---')[0]
                .trim();
            if (!accountName) return;

            const statusRow = rows.find(row => normalize(text(row.querySelector('[data-field="label"]'))) === 'account status');
            if (!statusRow) return;

            BUREAUS.forEach(bureau => {
                const status = normalize(text(statusRow.querySelector(`[data-field="${bureau.key}"]`)));
                if (status === 'open') byBureau[bureau.key].push({ account: accountName });
            });
        });

        return byBureau;
    }

    function enrich(inquiries, openAccountsByBureau) {
        return inquiries.map(item => ({
            ...item,
            connectedToOpen: (openAccountsByBureau[item.bureauKey] || [])
                .some(account => namesMatch(item.creditor, account.account))
        }));
    }

    function safeClipboard(value) {
        return navigator.clipboard?.writeText(value).catch(() => {
            const area = document.createElement('textarea');
            area.value = value;
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
        });
    }

    function filterForTab(items, tab) {
        if (tab === 'unconnected') return items.filter(x => !x.connectedToOpen && !x.alreadyDisputed);
        if (tab === 'new') return items.filter(x => isRecent(x) && !x.alreadyDisputed);
        return items;
    }

    function render(panel, inquiries) {
        const content = panel.querySelector('.ti-content');
        const copyButton = panel.querySelector('.ti-copy');
        let activeTab = 'all';

        function renderTab() {
            content.innerHTML = '';

            const visible = filterForTab(inquiries, activeTab);
            if (activeTab !== 'all') {
                const note = document.createElement('div');
                note.className = 'ti-note';
                note.textContent = activeTab === 'unconnected'
                    ? 'Only unconnected and not-already-disputed inquiries are shown for copying.'
                    : `Showing inquiries reported within the last ${CFG.recentDays} days, excluding already disputed items.`;
                content.appendChild(note);
            }

            const groups = BUREAUS.map(bureau => ({
                bureau,
                items: visible.filter(item => item.bureauKey === bureau.key)
            }));

            groups.forEach(group => {
                const section = document.createElement('div');
                section.className = 'ti-section';

                const title = document.createElement('div');
                title.className = 'ti-section-title';
                title.innerHTML = `<span>${group.bureau.label} (${group.items.length})</span><span>▾</span>`;
                title.addEventListener('click', () => section.classList.toggle('collapsed'));
                section.appendChild(title);

                const itemsWrap = document.createElement('div');
                itemsWrap.className = 'ti-items';

                if (!group.items.length) {
                    const empty = document.createElement('div');
                    empty.className = 'ti-empty';
                    empty.textContent = activeTab === 'new' ? 'No recent inquiries' : 'No inquiries';
                    itemsWrap.appendChild(empty);
                } else {
                    group.items.forEach(item => {
                        const card = document.createElement('div');
                        const state = item.alreadyDisputed ? 'disputed' : (item.connectedToOpen ? 'connected' : 'unconnected');
                        card.className = `ti-item ${state}`;

                        const head = document.createElement('div');
                        head.className = 'ti-head';

                        const creditor = document.createElement('div');
                        creditor.className = 'ti-creditor';
                        creditor.textContent = item.creditor;

                        const badge = document.createElement('div');
                        badge.className = 'ti-badge';
                        badge.textContent = item.alreadyDisputed ? 'AD' : (item.connectedToOpen ? 'OPEN' : 'UNLINKED');

                        head.appendChild(creditor);
                        head.appendChild(badge);
                        card.appendChild(head);

                        const meta = document.createElement('div');
                        meta.className = 'ti-meta';
                        meta.textContent = `${item.date || 'No date'} · ${item.action || 'Reported'}`;
                        card.appendChild(meta);

                        const id = document.createElement('div');
                        id.className = 'ti-id';
                        id.textContent = item.id;
                        card.appendChild(id);

                        itemsWrap.appendChild(card);
                    });
                }

                section.appendChild(itemsWrap);
                content.appendChild(section);
            });
        }

        function copyText() {
            const source = activeTab === 'all'
                ? inquiries
                : filterForTab(inquiries, activeTab);

            const lines = [];
            BUREAUS.forEach(bureau => {
                const group = source.filter(item => item.bureauKey === bureau.key);
                if (!group.length) return;
                lines.push(bureau.label);
                group.forEach(item => {
                    lines.push(`${item.creditor.toLowerCase()} ${item.date || ''} [${item.id}]`.trim());
                });
                lines.push('');
            });

            safeClipboard(lines.join('\n').trim());
            copyButton.textContent = '✓ COPIED';
            setTimeout(() => copyButton.textContent = 'COPY', 1200);
        }

        panel.querySelectorAll('.ti-tab').forEach(button => {
            button.addEventListener('click', () => {
                activeTab = button.dataset.tab;
                panel.querySelectorAll('.ti-tab').forEach(b => b.classList.toggle('active', b === button));
                renderTab();
            });
        });

        copyButton.onclick = copyText;
        renderTab();
    }

    function scan() {
        let panel = document.getElementById(CFG.panelId);
        if (panel) panel.remove();

        const style = document.getElementById(CFG.stylesId);
        if (style) style.remove();

        const styleEl = document.createElement('style');
        styleEl.id = CFG.stylesId;
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);

        const rawInquiries = extractInquiries();
        const openAccounts = extractOpenAccounts();
        const inquiries = enrich(rawInquiries, openAccounts);

        panel = document.createElement('div');
        panel.id = CFG.panelId;
        panel.innerHTML = `
            <div class="ti-top">
                <div class="ti-title">TUBOL INQUIRY</div>
                <div class="ti-controls">
                    <button class="ti-window" title="Minimize">−</button>
                    <button class="ti-window ti-close" title="Close">✕</button>
                </div>
            </div>
            <div class="ti-stats">
                <div class="ti-stat"><b>${inquiries.length}</b><span>Total</span></div>
                <div class="ti-stat"><b>${inquiries.filter(x => !x.connectedToOpen && !x.alreadyDisputed).length}</b><span>Unconnected</span></div>
                <div class="ti-stat"><b>${inquiries.filter(isRecent).length}</b><span>New</span></div>
                <div class="ti-stat"><b>${inquiries.filter(x => x.alreadyDisputed).length}</b><span>Disputed</span></div>
            </div>
            <div class="ti-tabs">
                <button class="ti-tab active" data-tab="all">ALL</button>
                <button class="ti-tab" data-tab="unconnected">UNCONNECTED</button>
                <button class="ti-tab" data-tab="new">NEW</button>
            </div>
            <div class="ti-content"></div>
            <div class="ti-footer">
                <button class="ti-copy">COPY</button>
                <button class="ti-scan">RESCAN</button>
            </div>
        `;
        document.body.appendChild(panel);

        panel.querySelector('.ti-close').onclick = () => panel.remove();
        panel.querySelector('.ti-window').onclick = () => {
            panel.classList.toggle('minimized');
            const hidden = panel.classList.contains('minimized');
            panel.querySelector('.ti-stats').style.display = hidden ? 'none' : '';
            panel.querySelector('.ti-tabs').style.display = hidden ? 'none' : '';
            panel.querySelector('.ti-content').style.display = hidden ? 'none' : '';
            panel.querySelector('.ti-footer').style.display = hidden ? 'none' : '';
        };
        panel.querySelector('.ti-scan').onclick = () => scan();

        render(panel, inquiries);

        console.info('[TUBOL-INQUIRY] Scan complete:', inquiries);
    }

    function installLauncher() {
        if (document.getElementById(CFG.scanButtonId)) return;
        const button = document.createElement('button');
        button.id = CFG.scanButtonId;
        button.textContent = 'TUBOL INQUIRY';
        button.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:999999;min-height:44px;padding:0 18px;border:0;border-radius:9px;background:#2374e1;color:#fff;cursor:pointer;font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.3)';
        button.onclick = scan;
        document.body.appendChild(button);
    }

    installLauncher();
})();
