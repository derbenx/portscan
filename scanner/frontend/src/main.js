import './style.css';
import {StartScan, StopScan, GetLocalIPPrefix} from '../wailsjs/go/main/App';
import {EventsOn} from '../wailsjs/runtime';

const pr = document.getElementById('pr');
const ip = document.getElementById('ip');
const st = document.getElementById('st');
const ed = document.getElementById('ed');
const sp = document.getElementById('sp');
const ep = document.getElementById('ep');
const to = document.getElementById('to');
const cn = document.getElementById('cn');
const rd = document.getElementById('rd');
const cb = document.getElementById('cb');

const pgsw = document.getElementById('pgsw');
const prsw = document.getElementById('prsw');
const prsc = document.getElementById('prsc');
const stsc = document.getElementById('stsc');

let scanType = 0;

GetLocalIPPrefix().then(prefix => {
    ip.value = prefix;
});

pgsw.addEventListener('click', () => initiateScan(-1));
prsw.addEventListener('click', () => initiateScan(0));
prsc.addEventListener('click', () => initiateScan(1));
stsc.addEventListener('click', () => {
    StopScan();
    rstclr();
});

function rstclr() {
    [ip, st, ed, sp, ep, to, cn].forEach(el => el.style.background = "black");
}

function initiateScan(type) {
    rstclr();
    scanType = type;
    if (type === -1) {
        ip.style.background = "green";
        st.style.background = "green";
        ed.style.background = "green";
    } else if (type === 0) {
        ip.style.background = "green";
        st.style.background = "green";
        ed.style.background = "green";
        sp.style.background = "green";
    } else if (type === 1) {
        ip.style.background = "green";
        st.style.background = "green";
        sp.style.background = "green";
        ep.style.background = "green";
    }

    pr.innerHTML = '';

    const req = {
        baseIP: ip.value,
        startIP: parseInt(st.value),
        endIP: parseInt(ed.value),
        startPort: parseInt(sp.value),
        endPort: parseInt(ep.value),
        timeout: parseFloat(to.value),
        connections: parseInt(cn.value),
        random: rd.checked,
        scanType: scanType
    };

    StartScan(req);
}

EventsOn("scanResult", (result) => {
    let gb = 'red';
    if (result.status === 'open' || result.status === 'up') gb = 'grn';
    if (result.status === 'closed') gb = 'yel';

    const lastPart = result.ip.split('.').pop();
    const portInfo = scanType === -1 ? '' : `:${result.port}`;
    const displayPort = scanType === -1 ? 'ping' : result.port;

    const out = `<a href="http://${result.ip}${portInfo}" target="_blank"><font id="${gb}">${lastPart} ${displayPort}:${result.status.substr(0, 2)}</font></a><br>`;

    const id = `c-${result.ip}-${result.port}`.replace(/\./g, '-');
    let cc = document.getElementById(id);
    if (!cc) {
        cc = document.createElement("div");
        cc.className = 'ch';
        cc.id = id;
        pr.appendChild(cc);
    }
    cc.innerHTML = out;

    if (cb.checked) {
        cc.scrollIntoView();
    }
});

EventsOn("scanComplete", () => {
    console.log("Scan complete");
    // Optionally alert user or change UI state
});
