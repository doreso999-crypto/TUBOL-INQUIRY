// ==UserScript==
// @name         TUBOL INQUIRY SCANNER
// @namespace    http://tampermonkey.net/
// @version      1.3.0
// @description  Standalone CRC hard-inquiry scanner with bureau-aware status, unique IDs, and intelligent creditor matching
// @match        https://app.creditrepaircloud.com/app/clients/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    if (window.__tubolInquiryInstalled) return;
    window.__tubolInquiryInstalled = true;

    const CFG = {
        panelId: 'tubol-inquiry-panel',
        launchId: 'tubol-inquiry-scan-btn',
        styleId: 'tubol-inquiry-styles',
        recentDays: 35,
        matchThreshold: 0.84
    };

    const BUREAUS = [
        { key: 'experian', short: 'EX', label: 'EXPERIAN' },
        { key: 'equifax', short: 'EQU', label: 'EQUIFAX' },
        { key: 'transunion', short: 'TU', label: 'TRANSUNION' }
    ];

    const ALIAS_GROUPS = [
        ['capital one', 'capitalone', 'capital', 'cap1', 'cap 1', 'capital one bank', 'capital one na'],
        ['cbna', 'citi bank na', 'citibank na', 'citibank national association'],
        ['syncb', 'synchrony', 'synchrony bank'],
        ['jpmcb', 'jpmorgan chase', 'jp morgan chase bank', 'chase bank'],
        ['bofa', 'bank of america', 'bank of america na'],
        ['usbank', 'us bank', 'u s bank', 'u s bancorp'],
        ['amex', 'american express'],
        ['discover', 'discover bank', 'discover financial'],
        ['ally', 'ally financial', 'ally bank'],
        ['vw credit', 'volkswagen credit', 'vw financial'],
        ['kia finance', 'kia motor finance'],
        ['gm financial', 'americredit', 'americredit financial'],
        ['gls', 'global lending services'],
        ['aca', 'american credit acceptance'],
        ['pra', 'portfolio recovery', 'portfolio recovery associates'],
        ['mcm', 'midland', 'midland credit', 'midland credit management'],
        ['lvnv', 'lvnv funding'],
        ['resurgent', 'resurgent capital services'],
        ['spring oaks', 'spring oaks capital', 'spring oaks capital llc'],
        ['golden 1', 'golden one', 'the golden 1', 'the golden one']
    ];

    const GENERIC = new Set([
        'bank','banking','financial','finance','services','service','national','association',
        'credit','company','co','corp','corporation','inc','incorporated','llc','na','usa','us','the','group'
    ]);

    const CSS = `
#${CFG.panelId}{position:fixed;top:20px;right:20px;width:500px;height:86vh;max-height:86vh;z-index:999999;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;background:#18191a;color:#e4e6eb;border:1px solid #3a3b3c;border-radius:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 14px 38px rgba(0,0,0,.48);transition:width .16s ease,height .16s ease}
#${CFG.panelId}.minimized{width:320px;height:58px;max-height:58px}
#${CFG.panelId}.minimized .ti-stats,#${CFG.panelId}.minimized .ti-tabs,#${CFG.panelId}.minimized .ti-content,#${CFG.panelId}.minimized .ti-footer{display:none!important}
#${CFG.panelId} .ti-top{min-height:58px;height:58px;display:flex;align-items:center;justify-content:space-between;padding:10px 14px;box-sizing:border-box;background:#242526;border-bottom:1px solid #3a3b3c;flex-shrink:0}
#${CFG.panelId} .ti-title-wrap{display:flex;align-items:center;gap:9px;min-width:0}
#${CFG.panelId} .ti-title{font-size:15px;font-weight:800;white-space:nowrap}
#${CFG.panelId} .ti-status{font-size:10px;color:#8f9397;white-space:nowrap}
#${CFG.panelId} .ti-controls{display:flex;gap:7px;flex-shrink:0}
#${CFG.panelId} button{font:inherit}
#${CFG.panelId} .ti-window{width:36px;height:36px;border:0;border-radius:50%;background:#3a3b3c;color:#e4e6eb;cursor:pointer;font-size:17px;line-height:1}
#${CFG.panelId} .ti-window:hover{background:#4e4f50}
#${CFG.panelId} .ti-close:hover{background:#e81123}
#${CFG.panelId} .ti-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;background:#18191a;border-bottom:1px solid #3a3b3c;flex-shrink:0}
#${CFG.panelId} .ti-stat{padding:10px 7px;background:#242526;border:1px solid #3a3b3c;border-radius:8px;text-align:center}
#${CFG.panelId} .ti-stat b{display:block;font-size:17px}
#${CFG.panelId} .ti-stat span{display:block;margin-top:3px;color:#8f9397;font-size:9px;text-transform:uppercase;letter-spacing:.4px}
#${CFG.panelId} .ti-tabs{display:flex;gap:4px;padding:6px 8px 0;background:#242526;border-bottom:1px solid #3a3b3c;flex-shrink:0}
#${CFG.panelId} .ti-tab{flex:1;height:44px;background:transparent;border:0;color:#b0b3b8;border-radius:8px 8px 0 0;cursor:pointer;font-size:12px;font-weight:800}
#${CFG.panelId} .ti-tab:hover{background:#3a3b3c;color:#fff}
#${CFG.panelId} .ti-tab.active{color:#2d88ff;background:#18191a;box-shadow:inset 0 -3px #2d88ff}
#${CFG.panelId} .ti-content{flex:1;min-height:0;overflow:auto;padding:12px 14px 80px;background:#18191a}
#${CFG.panelId} .ti-content::-webkit-scrollbar{width:8px}
#${CFG.panelId} .ti-content::-webkit-scrollbar-thumb{background:#4a4b4c;border-radius:10px}
#${CFG.panelId} .ti-note{margin:0 3px 12px;color:#8f9397;font-size:10px;line-height:1.5;text-align:center}
#${CFG.panelId} .ti-section{margin-bottom:18px}
#${CFG.panelId} .ti-section-title{display:flex;justify-content:space-between;align-items:center;margin:8px 4px 10px;color:#2d88ff;font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;user-select:none}
#${CFG.panelId} .ti-item{padding:12px 13px;margin-bottom:8px;border-radius:9px;border:1px solid transparent}
#${CFG.panelId} .ti-item.connected{background:rgba(58,178,92,.10);border-color:rgba(58,178,92,.28)}
#${CFG.panelId} .ti-item.unconnected{background:rgba(224,82,82,.10);border-color:rgba(224,82,82,.28)}
#${CFG.panelId} .ti-item.disputed{background:rgba(120,120,120,.08);border-color:rgba(120,120,120,.18);opacity:.8}
#${CFG.panelId} .ti-head{display:flex;gap:8px;align-items:center}
#${CFG.panelId} .ti-creditor{flex:1;min-width:0;font-size:14px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#${CFG.panelId} .ti-badge{flex-shrink:0;padding:3px 7px;border-radius:6px;background:#3a3b3c;font-size:10px;font-weight:800}
#${CFG.panelId} .ti-meta{margin-top:5px;color:#9a9da1;font-size:11px;line-height:1.45}
#${CFG.panelId} .ti-match{margin-top:5px;color:#b0b3b8;font-size:10px;line-height:1.45}
#${CFG.panelId} .ti-id{margin-top:6px;color:#6f7174;font-size:10px;word-break:break-all}
#${CFG.panelId} .ti-empty{margin:10px 0;padding:28px 18px;background:#242526;border:1px solid #3a3b3c;border-radius:10px;color:#8f9397;text-align:center;font-size:12px}
#${CFG.panelId} .ti-footer{position:absolute;left:0;right:0;bottom:0;display:flex;gap:8px;padding:12px 14px;background:#242526;border-top:1px solid #3a3b3c}
#${CFG.panelId} .ti-footer button{flex:1;height:40px;border:0;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800}
#${CFG.panelId} .ti-copy{background:#3a3b3c;color:#e4e6eb}
#${CFG.panelId} .ti-copy:hover{background:#4e4f50}
#${CFG.panelId} .ti-scan{background:#2374e1;color:#fff}
#${CFG.panelId} .ti-scan:hover{background:#3982e4}
#${CFG.launchId}{position:fixed;left:20px;bottom:20px;z-index:999999;min-height:46px;padding:0 18px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#2374e1;color:#fff;cursor:pointer;font:700 13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 7px 20px rgba(0,0,0,.30);transition:transform .12s ease,background .12s ease}
#${CFG.launchId}:hover{background:#3982e4;transform:translateY(-1px)}
@media(max-width:700px){#${CFG.panelId}{top:10px;right:10px;width:calc(100vw - 20px);height:90vh;max-height:90vh}#${CFG.launchId}{left:10px;bottom:10px}}
`;

    function normalize(value) {
        return String(value || '').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
    }

    function compact(value) { return normalize(value).replace(/\s+/g,''); }

    function tokens(value) { return normalize(value).split(' ').filter(x => x && !GENERIC.has(x)); }

    function aliasKey(value) {
        const n=normalize(value), c=compact(value);
        for(const group of ALIAS_GROUPS){
            const aliases=group.map(normalize);
            if(aliases.includes(n) || aliases.some(a=>compact(a)===c)) return aliases[0];
        }
        return '';
    }

    function matchScore(a,b){
        const x=normalize(a),y=normalize(b);
        if(!x||!y) return {score:0,reason:'empty name'};
        if(x===y) return {score:1,reason:'exact name'};
        const ax=aliasKey(x),ay=aliasKey(y);
        if(ax&&ay&&ax===ay) return {score:1,reason:'recognized creditor alias'};
        if(compact(x)===compact(y)) return {score:.98,reason:'normalized name'};

        const tx=new Set(tokens(x)),ty=new Set(tokens(y));
        if(tx.size&&ty.size){
            let hit=0; tx.forEach(t=>{if(ty.has(t))hit++;});
            const union=new Set([...tx,...ty]).size;
            const j=union?hit/union:0;
            const containment=hit/Math.max(tx.size,ty.size);
            if(j>=.84||containment>=.92) return {score:Math.max(j,containment),reason:'high token similarity'};
        }

        const aa=tokens(x).map(t=>t[0]).join(''), ab=tokens(y).map(t=>t[0]).join('');
        if(aa.length>=3&&aa===ab) return {score:.94,reason:'matching acronym'};

        const cx=compact(x),cy=compact(y),short=cx.length<=cy.length?cx:cy,long=cx.length>cy.length?cx:cy;
        if(short.length>=6&&long.includes(short)) return {score:.88,reason:'specific name containment'};
        return {score:0,reason:'no reliable match'};
    }

    function findBestMatch(inquiry, accountsByBureau){
        const candidates=accountsByBureau[inquiry.bureauKey]||[];
        let best=null;
        candidates.forEach(account=>{
            const m=matchScore(inquiry.creditor,account.account);
            if(!best||m.score>best.score) best={...m,account:account.account};
        });
        if(!best||best.score<CFG.matchThreshold){
            return {connected:false,matchedAccount:null,score:best?.score||0,reason:best?`Best candidate: ${best.account}`:'No open-account candidates'};
        }
        return {connected:true,matchedAccount:best.account,score:best.score,reason:best.reason};
    }

    function stableHash(value){
        let h=2166136261;
        for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
        return (h>>>0).toString(16).toUpperCase().padStart(8,'0');
    }

    function parseDate(value){
        const m=String(value||'').match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
        if(!m)return null;
        let y=Number(m[3]); if(y<100)y+=y<=69?2000:1900;
        const d=new Date(y,Number(m[1])-1,Number(m[2]));
        return Number.isNaN(d.getTime())?null:d;
    }

    function isRecent(item){
        const d=parseDate(item.date); if(!d)return false;
        const today=new Date();today.setHours(0,0,0,0);
        const cutoff=new Date(today);cutoff.setDate(cutoff.getDate()-CFG.recentDays);
        d.setHours(0,0,0,0);return d>=cutoff&&d<=today;
    }

    function text(el){return (el?.innerText||el?.textContent||'').trim();}

    function extractLabel(row){
        const raw=text(row.querySelector('[data-field="label"]')); if(!raw)return {creditor:'',date:''};
        const m=raw.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
        const date=m?m[0]:'';
        let creditor=m?raw.slice(0,m.index):raw;
        creditor=creditor.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).join(' ').replace(/\s*:\s*$/,'').trim();
        return {creditor,date};
    }

    function extractInquiries(){
        const container=document.getElementById('div-preview-credit-inquiries');
        if(!container)return [];
        const grid=container.querySelector('.MuiDataGrid-root');
        if(!grid)return [];
        const results=[];

        grid.querySelectorAll('.MuiDataGrid-row').forEach((row,index)=>{
            const rowId=row.getAttribute('data-id')||`Inquiries-${index}`;
            if(!/^Inquiries-/i.test(rowId))return;
            const {creditor,date}=extractLabel(row); if(!creditor)return;

            BUREAUS.forEach(bureau=>{
                const cell=row.querySelector(`[data-field="${bureau.key}"]`); if(!cell)return;
                const cellText=text(cell), hasContent=!!cellText||cell.children.length>0; if(!hasContent)return;
                const seed=`${rowId}|${bureau.key}|${normalize(creditor)}|${date}`;
                results.push({id:`INQ-${stableHash(seed)}`,rowId,creditor,date,bureauKey:bureau.key,bureauLabel:bureau.label,bureauShort:bureau.short,action:cellText||'Reported',alreadyDisputed:/already\s+disputed/i.test(cellText),connectedToOpen:false,matchedAccount:null,matchScore:0,matchReason:''});
            });
        });

        const unique=[],seen=new Set();
        results.forEach(item=>{const key=`${item.bureauKey}|${normalize(item.creditor)}|${item.date}`;if(seen.has(key))return;seen.add(key);unique.push(item);});
        return unique;
    }

    function extractOpenAccounts(){
        const byBureau={experian:[],equifax:[],transunion:[]};
        document.querySelectorAll('.MuiDataGrid-root').forEach(grid=>{
            if(grid.closest('#div-preview-credit-inquiries'))return;
            const rows=Array.from(grid.querySelectorAll('.MuiDataGrid-row'));
            const accountRow=rows.find(r=>(r.getAttribute('data-id')||'').includes('Account #')); if(!accountRow)return;
            const account=(accountRow.getAttribute('data-id')||'').replace(/^summary_/i,'').split('---')[0].trim(); if(!account)return;
            const statusRow=rows.find(r=>normalize(text(r.querySelector('[data-field="label"]')))==='account status'); if(!statusRow)return;
            BUREAUS.forEach(b=>{if(normalize(text(statusRow.querySelector(`[data-field="${b.key}"]`)))==='open')byBureau[b.key].push({account});});
        });
        return byBureau;
    }

    function render(panel,inquiries){
        const content=panel.querySelector('.ti-content'),copy=panel.querySelector('.ti-copy'); let tab='all';
        function draw(){
            content.innerHTML=''; const items=tab==='all'?inquiries:tab==='unconnected'?inquiries.filter(i=>!i.connectedToOpen&&!i.alreadyDisputed):tab==='new'?inquiries.filter(i=>isRecent(i)&&!i.alreadyDisputed):inquiries.filter(i=>i.alreadyDisputed);
            const note=document.createElement('div');note.className='ti-note';note.textContent=tab==='unconnected'?'Only unconnected and not-already-disputed inquiries are shown.':tab==='new'?`Showing last ${CFG.recentDays} days, excluding already disputed items.`:tab==='disputed'?'Already-disputed inquiries are shown here.':'Green = matched OPEN account. Red = no reliable OPEN match. Gray = already disputed.';content.appendChild(note);
            BUREAUS.forEach(b=>{
                const group=items.filter(i=>i.bureauKey===b.key),section=document.createElement('div');section.className='ti-section';
                const title=document.createElement('div');title.className='ti-section-title';title.innerHTML=`<span>${b.label} (${group.length})</span><span>▾</span>`;title.onclick=()=>section.classList.toggle('collapsed');section.appendChild(title);
                const wrap=document.createElement('div');
                if(!group.length){const empty=document.createElement('div');empty.className='ti-empty';empty.textContent='No inquiries';wrap.appendChild(empty);}else group.forEach(item=>{
                    const card=document.createElement('div');card.className=`ti-item ${item.alreadyDisputed?'disputed':item.connectedToOpen?'connected':'unconnected'}`;
                    const head=document.createElement('div');head.className='ti-head';
                    const name=document.createElement('div');name.className='ti-creditor';name.textContent=item.creditor;
                    const badge=document.createElement('div');badge.className='ti-badge';badge.textContent=item.alreadyDisputed?'AD':item.connectedToOpen?'OPEN':'UNLINKED';head.append(name,badge);card.appendChild(head);
                    const meta=document.createElement('div');meta.className='ti-meta';meta.textContent=`${item.date||'No date'} · ${item.action||'Reported'}`;card.appendChild(meta);
                    const match=document.createElement('div');match.className='ti-match';match.textContent=item.connectedToOpen?`Matched: ${item.matchedAccount} · ${(item.matchScore*100).toFixed(0)}% · ${item.matchReason}`:item.alreadyDisputed?'Already disputed':item.matchReason;card.appendChild(match);
                    const id=document.createElement('div');id.className='ti-id';id.textContent=item.id;card.appendChild(id);wrap.appendChild(card);
                });
                section.appendChild(wrap);content.appendChild(section);
            });
        }
        panel.querySelectorAll('.ti-tab').forEach(btn=>btn.onclick=()=>{tab=btn.dataset.tab;panel.querySelectorAll('.ti-tab').forEach(b=>b.classList.toggle('active',b===btn));draw();});
        copy.onclick=()=>{const items=tab==='all'?inquiries:tab==='unconnected'?inquiries.filter(i=>!i.connectedToOpen&&!i.alreadyDisputed):tab==='new'?inquiries.filter(i=>isRecent(i)&&!i.alreadyDisputed):inquiries.filter(i=>i.alreadyDisputed);const lines=[];BUREAUS.forEach(b=>{const g=items.filter(i=>i.bureauKey===b.key);if(!g.length)return;lines.push(b.label);g.forEach(i=>lines.push(`${i.creditor.toLowerCase()} ${i.date||''} [${i.id}]`.trim()));lines.push('');});const value=lines.join('\n').trim();const promise=navigator.clipboard?.writeText?navigator.clipboard.writeText(value):Promise.resolve().then(()=>{const a=document.createElement('textarea');a.value=value;document.body.appendChild(a);a.select();document.execCommand('copy');a.remove();});promise.finally(()=>{copy.textContent='✓ COPIED';setTimeout(()=>copy.textContent='COPY',1200);});};
        draw();
    }

    function scan(){
        document.getElementById(CFG.panelId)?.remove();document.getElementById(CFG.styleId)?.remove();
        const style=document.createElement('style');style.id=CFG.styleId;style.textContent=CSS;document.head.appendChild(style);
        const raw=extractInquiries(),open=extractOpenAccounts();
        const inquiries=raw.map(item=>{const m=findBestMatch(item,open);return {...item,connectedToOpen:m.connected,matchedAccount:m.matchedAccount,matchScore:m.score,matchReason:m.reason};});
        const panel=document.createElement('div');panel.id=CFG.panelId;
        panel.innerHTML=`<div class="ti-top"><div class="ti-title-wrap"><div class="ti-title">TUBOL INQUIRY</div><div class="ti-status">INTELLIGENT MATCHING</div></div><div class="ti-controls"><button class="ti-window ti-min" title="Minimize / Restore">−</button><button class="ti-window ti-close" title="Close">✕</button></div></div><div class="ti-stats"><div class="ti-stat"><b>${inquiries.length}</b><span>Total</span></div><div class="ti-stat"><b>${inquiries.filter(i=>!i.connectedToOpen&&!i.alreadyDisputed).length}</b><span>Unconnected</span></div><div class="ti-stat"><b>${inquiries.filter(isRecent).length}</b><span>New</span></div><div class="ti-stat"><b>${inquiries.filter(i=>i.alreadyDisputed).length}</b><span>Disputed</span></div></div><div class="ti-tabs"><button class="ti-tab active" data-tab="all">ALL</button><button class="ti-tab" data-tab="unconnected">UNCONNECTED</button><button class="ti-tab" data-tab="new">NEW</button><button class="ti-tab" data-tab="disputed">DISPUTED</button></div><div class="ti-content"></div><div class="ti-footer"><button class="ti-copy">COPY</button><button class="ti-scan">RESCAN</button></div>`;
        document.body.appendChild(panel);
        const min=panel.querySelector('.ti-min');min.onclick=()=>{const state=panel.classList.toggle('minimized');min.textContent=state?'+':'−';min.title=state?'Restore':'Minimize';};
        panel.querySelector('.ti-close').onclick=()=>panel.remove();panel.querySelector('.ti-scan').onclick=scan;render(panel,inquiries);
        console.info('[TUBOL-INQUIRY] Scan complete',{total:inquiries.length,unconnected:inquiries.filter(i=>!i.connectedToOpen&&!i.alreadyDisputed).length,openMatches:inquiries.filter(i=>i.connectedToOpen).length});
    }

    function installLauncher(){
        if(document.getElementById(CFG.launchId))return;
        const button=document.createElement('button');button.id=CFG.launchId;button.textContent='TUBOL INQUIRY';button.title='Scan Credit Repair Cloud inquiries';button.onclick=scan;document.body.appendChild(button);
    }

    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installLauncher,{once:true}); else installLauncher();
})();
