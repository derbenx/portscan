import './style.css';
import {StartScan, StopScan, GetLocalIPPrefix, SendWOL, GetMACAddress} from '../wailsjs/go/main/App';
import {EventsOn} from '../wailsjs/runtime';

const pr = document.getElementById('pr');
const ipInput = document.getElementById('ip');
const stInput = document.getElementById('st');
const edInput = document.getElementById('ed');
const spInput = document.getElementById('sp');
const epInput = document.getElementById('ep');
const toInput = document.getElementById('to');
const cnInput = document.getElementById('cn');
const rdCheckbox = document.getElementById('rd');
const hcCheckbox = document.getElementById('hc');
const htCheckbox = document.getElementById('ht');
const cbCheckbox = document.getElementById('cb');

const pgsw = document.getElementById('pgsw');
const prsw = document.getElementById('prsw');
const prsc = document.getElementById('prsc');
const stsc = document.getElementById('stsc');

const popup = document.getElementById('popup');
const popupDetails = document.getElementById('popup-details');
const closeBtn = document.getElementsByClassName('close')[0];

let scanType = 0;
let resultsData = {};

GetLocalIPPrefix().then(prefix => {
    ipInput.value = prefix;
});

pgsw.addEventListener('click', () => initiateScan(-1));
prsw.addEventListener('click', () => initiateScan(0));
prsc.addEventListener('click', () => initiateScan(1));
stsc.addEventListener('click', () => {
    StopScan();
    rstclr();
});

closeBtn.onclick = () => popup.style.display = "none";
window.onclick = (event) => {
    if (event.target == popup) popup.style.display = "none";
}

function rstclr() {
    [ipInput, stInput, edInput, spInput, epInput, toInput, cnInput].forEach(el => el.style.background = "black");
}

function initiateScan(type) {
    rstclr();
    scanType = type;
    const baseIP = ipInput.value;
    const startIP = parseInt(stInput.value);
    const endIP = parseInt(edInput.value);
    const startPort = parseInt(spInput.value);
    const endPort = parseInt(epInput.value);

    if (type === -1) {
        ipInput.style.background = "green";
        stInput.style.background = "green";
        edInput.style.background = "green";
    } else if (type === 0) {
        ipInput.style.background = "green";
        stInput.style.background = "green";
        edInput.style.background = "green";
        spInput.style.background = "green";
    } else if (type === 1) {
        ipInput.style.background = "green";
        stInput.style.background = "green";
        spInput.style.background = "green";
        epInput.style.background = "green";
    }

    pr.innerHTML = '';
    resultsData = {};

    const req = {
        baseIP: baseIP,
        startIP: startIP,
        endIP: endIP,
        startPort: startPort,
        endPort: endPort,
        timeout: parseFloat(toInput.value),
        connections: parseInt(cnInput.value),
        random: rdCheckbox.checked,
        scanType: scanType
    };

    StartScan(req);
}

function createPlaceholder(ip, port) {
    const id = `c-${ip}-${port}`.replace(/\./g, '-');
    const cc = document.createElement("div");
    cc.className = 'ch';
    cc.id = id;
    cc.innerHTML = `<font id="txt">${ip.split('.').pop()} ${scanType === -1 ? 'ping' : port}:.. </font>`;
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
    if (result.status === 'open' || result.status === 'up') gb = 'grn';
    if (result.status === 'closed') gb = 'ora';

    // Apply filters
    if (result.status === 'closed' && hcCheckbox.checked) {
        cc.style.display = 'none';
    } else if (result.status === 'down' && htCheckbox.checked) {
        cc.style.display = 'none';
    } else {
        cc.style.display = 'block';
    }

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
    const url = `http://${result.ip}${portInfo}`;
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
});

// Update display when filters change
hcCheckbox.onchange = htCheckbox.onchange = () => {
    for (const id in resultsData) {
        updateEntry(resultsData[id]);
    }
};
