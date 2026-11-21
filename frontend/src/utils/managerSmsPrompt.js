/**
 * "Also send this SMS to the manager?" prompt.
 *
 * Every request that records a received payment or sends an SMS goes through
 * the axios interceptor in api/axios.js. For those requests the user is asked
 * whether the manager (number saved in Settings > Manager SMS Phone) should get
 * a copy too. The answer is sent to the backend in the X-Manager-Sms header.
 */

// ── Which requests send an SMS (or record a received payment) ──────────────
const has = (v) => v === true || v === 'true';
const positive = (v) => Number(v) > 0;

const RULES = [
    // Payments received (receipts). Vouchers (direction "paid") send no SMS.
    { method: 'post', path: /^\/payments\/?$/, when: (b) => b?.direction !== 'paid' && b?.sendSms !== false && b?.sendSms !== 'false' },
    { method: 'post', path: /^\/payments\/[^/]+\/send-sms$/ },
    // Invoices
    { method: 'post', path: /^\/invoices\/?$/, when: (b) => has(b?.sendSms) || positive(b?.advanceAmount) },
    { method: 'put', path: /^\/invoices\/[^/]+$/, when: (b) => has(b?.sendSms) },
    // Quotations / estimates
    { method: 'post', path: /^\/crm\/quotations\/?$/, when: (b) => has(b?.sendSms) },
    { method: 'put', path: /^\/crm\/quotations\/[^/]+$/, when: (b) => has(b?.sendSms) },
    { method: 'post', path: /^\/crm\/quotations\/[^/]+\/convert-to-(invoice|project)$/, when: (b) => has(b?.sendSms) || positive(b?.advanceAmount) },
    // GRN (supplier SMS)
    { method: 'post', path: /^\/grns\/?$/, when: (b) => has(b?.sendSms) },
    { method: 'post', path: /^\/grns\/[^/]+\/approve$/, when: (b) => has(b?.sendSms) },
    { method: 'put', path: /^\/grns\/[^/]+\/approve-qa$/, when: (b) => has(b?.sendSms) },
    { method: 'post', path: /^\/grns\/[^/]+\/send-sms$/ },
    // HR / payroll SMS
    { method: 'post', path: /^\/hr\/employees\/[^/]+\/payment-sheet\/send-sms$/ },
    { method: 'post', path: /^\/payroll\/payslips\/[^/]+\/send-sms$/ },
    // Project delivered
    { method: 'post', path: /^\/projects\/[^/]+\/deliver$/, when: (b) => has(b?.sendSms) },
    // Manual / custom SMS
    { method: 'post', path: /^\/(audit\/)?sms\/send-manual$/ },
];

const normalisePath = (config) => {
    let url = String(config.url || '');
    const base = String(config.baseURL || '');
    if (base && url.startsWith(base)) url = url.slice(base.length);
    url = url.replace(/^https?:\/\/[^/]+/, '');   // strip any host
    url = url.split('?')[0].split('#')[0];
    url = url.replace(/^\/api(?=\/)/, '');         // allow "/api/..." spellings
    if (!url.startsWith('/')) url = '/' + url;
    return url.replace(/\/+$/, '') || '/';
};

const parseBody = (data) => {
    if (!data) return {};
    if (typeof data === 'string') {
        try { return JSON.parse(data); } catch { return {}; }
    }
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        return Object.fromEntries(data.entries());
    }
    return data;
};

export const isManagerSmsRequest = (config) => {
    const method = String(config.method || 'get').toLowerCase();
    if (method === 'get') return false;
    const path = normalisePath(config);
    const body = parseBody(config.data);
    return RULES.some((r) => r.method === method && r.path.test(path) && (!r.when || r.when(body)));
};

// ── Manager phone number from Settings (cached for a short while) ──────────
let cachedPhone = null;
let cachedAt = 0;
const CACHE_MS = 2 * 60 * 1000;

export const clearManagerPhoneCache = () => { cachedAt = 0; cachedPhone = null; };

export const getManagerPhone = async (apiInstance) => {
    if (cachedAt && Date.now() - cachedAt < CACHE_MS) return cachedPhone;
    try {
        const res = await apiInstance.get('/settings', { skipManagerSmsPrompt: true });
        cachedPhone = (res.data?.data?.managerSmsPhone || '').trim() || null;
    } catch {
        cachedPhone = null;
    }
    cachedAt = Date.now();
    return cachedPhone;
};

// ── The question dialog (plain DOM so it works from the axios layer) ───────
let openDialog = null; // reuse one answer if several requests fire at the same moment

export const askSendToManager = (managerPhone) => {
    if (openDialog) return openDialog;
    openDialog = new Promise((resolve) => {
        const isDark = document.documentElement.classList.contains('dark');
        const c = isDark
            ? { card: '#111F33', text: '#E2E8F0', sub: '#94A3B8', border: '#334155', noBg: '#1E293B' }
            : { card: '#FFFFFF', text: '#0F172A', sub: '#475569', border: '#E2E8F0', noBg: '#F1F5F9' };

        const overlay = document.createElement('div');
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(2,6,23,0.6);';

        const card = document.createElement('div');
        card.style.cssText = `width:100%;max-width:420px;background:${c.card};color:${c.text};border:1px solid ${c.border};border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,0.35);padding:20px;font-family:inherit;`;

        const title = document.createElement('div');
        title.style.cssText = 'font-size:16px;font-weight:700;margin-bottom:6px;';
        title.textContent = 'Send a copy to the manager?';

        const titleSi = document.createElement('div');
        titleSi.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:10px;';
        titleSi.textContent = 'මේ SMS එක manager ටත් යවන්නද?';

        const sub = document.createElement('div');
        sub.style.cssText = `font-size:13px;color:${c.sub};margin-bottom:18px;line-height:1.5;`;
        sub.textContent = `Manager number: ${managerPhone}`;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;';

        const noBtn = document.createElement('button');
        noBtn.type = 'button';
        noBtn.textContent = 'No / එපා';
        noBtn.style.cssText = `padding:10px 16px;border-radius:10px;border:1px solid ${c.border};background:${c.noBg};color:${c.text};font-weight:600;font-size:14px;cursor:pointer;min-height:44px;`;

        const yesBtn = document.createElement('button');
        yesBtn.type = 'button';
        yesBtn.textContent = 'Yes, send / ඔව් යවන්න';
        yesBtn.style.cssText = 'padding:10px 16px;border-radius:10px;border:none;background:#059669;color:#fff;font-weight:700;font-size:14px;cursor:pointer;min-height:44px;';

        const finish = (answer) => {
            document.removeEventListener('keydown', onKey, true);
            overlay.remove();
            openDialog = null;
            resolve(answer);
        };
        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
            if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); finish(document.activeElement !== noBtn); }
        };

        noBtn.addEventListener('click', () => finish(false));
        yesBtn.addEventListener('click', () => finish(true));
        document.addEventListener('keydown', onKey, true);

        row.append(noBtn, yesBtn);
        card.append(title, titleSi, sub, row);
        overlay.append(card);
        document.body.append(overlay);
        setTimeout(() => yesBtn.focus(), 30);
    });
    return openDialog;
};
