import './style.css';
import {StartScan, StopScan, GetLocalIPPrefix, SendWOL, GetMACAddress} from '../wailsjs/go/main/App';
import {EventsOn} from '../wailsjs/runtime';

const pr = document.getElementById('pr');
const stInput = document.getElementById('st');
const edInput = document.getElementById('ed');
const spInput = document.getElementById('sp');
const epInput = document.getElementById('ep');
const toInput = document.getElementById('to');
const cnInput = document.getElementById('cn');
const rdCheckbox = document.getElementById('rd');
const cyCheckbox = document.getElementById('cy');
const huCheckbox = document.getElementById('hu');
const hoCheckbox = document.getElementById('ho');
const hcCheckbox = document.getElementById('hc');
const htCheckbox = document.getElementById('ht');
const cbCheckbox = document.getElementById('cb');

const pgsw = document.getElementById('pgsw');
const prsw = document.getElementById('prsw');
const prsc = document.getElementById('prsc');
const stsc = document.getElementById('stsc');
const lssw = document.getElementById('lssw');
const lpInput = document.getElementById('lp');

const popup = document.getElementById('popup');
const popupDetails = document.getElementById('popup-details');
const closeBtn = document.getElementsByClassName('close')[0];

let scanType = 0;
let resultsData = {};

GetLocalIPPrefix().then(prefix => {
    stInput.value = prefix;
    // Set end IP to the same subnet but .254
    const parts = prefix.split('.');
    if (parts.length === 4) {
        edInput.value = `${parts[0]}.${parts[1]}.${parts[2]}.254`;
    }
});

// Set Stop Scan active on startup
setActiveButton(stsc);

pgsw.addEventListener('click', () => initiateScan(-1, pgsw));
prsw.addEventListener('click', () => initiateScan(0, prsw));
prsc.addEventListener('click', () => initiateScan(1, prsc));
lssw.addEventListener('click', () => initiateScan(2, lssw));
stsc.addEventListener('click', () => {
    StopScan();
    setActiveButton(stsc);
    rstclr();
});

closeBtn.onclick = () => popup.style.display = "none";
window.onclick = (event) => {
    if (event.target == popup) popup.style.display = "none";
}

function rstclr() {
    [stInput, edInput, spInput, epInput, toInput, cnInput, lpInput].forEach(el => {
        if (el) {
            el.style.background = "black";
            el.classList.remove('active');
        }
    });
}

function setActiveButton(activeBtn) {
    [pgsw, prsw, prsc, stsc, lssw].forEach(btn => btn.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

function initiateScan(type, btn) {
    rstclr();
    setActiveButton(btn);
    scanType = type;
    const startIP = stInput.value;
    const endIP = edInput.value;
    const startPort = parseInt(spInput.value);
    const endPort = parseInt(epInput.value);

    if (type === -1) {
        stInput.style.background = "green";
        edInput.style.background = "green";
    } else if (type === 0) {
        stInput.style.background = "green";
        edInput.style.background = "green";
        spInput.style.background = "green";
    } else if (type === 1) {
        stInput.style.background = "green";
        spInput.style.background = "green";
        epInput.style.background = "green";
    } else if (type === 2) {
        stInput.style.background = "green";
        edInput.style.background = "green";
        lpInput.style.background = "green";
        lpInput.classList.add('active');
    }

    pr.innerHTML = '';
    resultsData = {};

    const req = {
        startIP: startIP,
        endIP: endIP,
        startPort: startPort,
        endPort: endPort,
        timeout: parseFloat(toInput.value),
        connections: parseInt(cnInput.value),
        random: rdCheckbox.checked,
        cyclic: cyCheckbox.checked,
        scanType: scanType,
        ports: lpInput.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p))
    };

    StartScan(req);
}

function createPlaceholder(ip, port) {
    const id = `c-${ip}-${port}`.replace(/\./g, '-');
    const cc = document.createElement("div");
    cc.className = 'ch';
    cc.id = id;
    cc.innerHTML = `<font id="txt">${ip.split('.').pop()} ${scanType === -1 ? 'ping' : port}:.. </font>`;

    if (huCheckbox.checked) {
        cc.style.display = 'none';
    }

    pr.appendChild(cc);

    cc.onclick = () => {
        if (resultsData[id]) showDetails(resultsData[id]);
    };
}

function updateEntry(result) {
    const id = `c-${result.ip}-${result.port}`.replace(/\./g, '-');
    resultsData[id] = result;
    const cc = document.getElementById(id);
    if (!cc) return;

    let gb = 'red'; // down/timeout
    const isOpen = result.status === 'open' || result.status === 'up';
    if (isOpen) gb = 'grn';
    if (result.status === 'closed') gb = 'ora';

    // Apply filters
    let hide = false;
    if (isOpen && hoCheckbox.checked) hide = true;
    if (result.status === 'closed' && hcCheckbox.checked) hide = true;
    if (result.status === 'down' && htCheckbox.checked) hide = true;

    cc.style.display = hide ? 'none' : 'block';

    const lastPart = result.ip.split('.').pop();
    const displayPort = scanType === -1 ? 'ping' : result.port;
    const statusShort = result.status.substr(0, 2);

    cc.innerHTML = `<font id="${gb}">${lastPart} ${displayPort}:${statusShort}</font>`;

    if (cbCheckbox.checked && cc.style.display !== 'none') {
        cc.scrollIntoView();
    }
}

function showDetails(result) {
    const portInfo = (scanType === -1 || result.port === 0) ? '' : `:${result.port}`;
    let protocol = 'http';
    if (result.port === 443) protocol = 'https';
    if (result.port === 21) protocol = 'ftp';
    const url = `${protocol}://${result.ip}${portInfo}`;
    popupDetails.innerHTML = `
        <p><b>IP:</b> ${result.ip}</p>
        <p><b>Port:</b> ${result.port || 'N/A'}</p>
        <p><b>Status:</b> ${result.status}</p>
        <p><b>MAC:</b> <span id="popup-mac">Loading...</span></p>
        <div id="wol-container"></div>
        <p><a href="${url}" target="_blank" style="color: #4da6ff;">Open ${url}</a></p>
    `;
    popup.style.display = "block";

    GetMACAddress(result.ip).then(mac => {
        const macEl = document.getElementById('popup-mac');
        if (macEl) {
            macEl.innerText = mac || 'Unknown';
        }
        if (mac) {
            const wolContainer = document.getElementById('wol-container');
            if (wolContainer) {
                wolContainer.innerHTML = `<button id="wol-btn">Send WOL</button>`;
                document.getElementById('wol-btn').onclick = () => {
                    SendWOL(mac).then(() => {
                        alert(`WOL packet sent to ${mac}`);
                    }).catch(err => {
                        alert(`Error sending WOL: ${err}`);
                    });
                };
            }
        }
    });
}

EventsOn("scanChunk", (chunk) => {
    chunk.forEach(t => {
        createPlaceholder(t.IP || t.ip, t.Port || t.port);
    });
});

EventsOn("scanResult", (result) => {
    updateEntry(result);
});

EventsOn("scanComplete", () => {
    console.log("Scan complete");
    setActiveButton(stsc);
    rstclr();
});

// Update display when filters change
huCheckbox.onchange = () => {
    const placeholders = document.querySelectorAll('.ch');
    placeholders.forEach(cc => {
        const id = cc.id;
        if (!resultsData[id]) {
            cc.style.display = huCheckbox.checked ? 'none' : 'block';
        }
    });
};

hoCheckbox.onchange = hcCheckbox.onchange = htCheckbox.onchange = () => {
    for (const id in resultsData) {
        updateEntry(resultsData[id]);
    }
};
