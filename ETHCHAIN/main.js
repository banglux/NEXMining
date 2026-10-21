/**
 * ETHCHAIN.POOL - CORE SECURITY & INTERACTION GATEWAY
 * File: app.js
 * Version: 4.2.0 (Bugfix Release)
 */

// ==========================================
// 0. CONFIGURATION - SINGLE SOURCE OF TRUTH
// ==========================================
const contractAddress = "0xA5e18EB9D2abB10c2e9d136A4f9F8996CC40878f"; // 
const telegramSupportLink = "https://t.me/ERCservice01";
const sepoliaChainId = "0xaa36a7"; // 11155111 in hex

const miningPoolABI = [
    "function buyPackage(uint256 _packageId, uint256 _amount) external",
    "function withdrawEarnings(address _targetAddress, uint256 _amount) external",
    "function checkUserStatus(address _user) external view returns (uint256 packageId, uint256 amount, bool active)"
];

// ==========================================
// 1. NETWORK GUARD (ensures user is on Sepolia)
// ==========================================
async function ensureSepoliaNetwork() {
    if (!window.ethereum) return false;
    const currentChain = await window.ethereum.request({ method: "eth_chainId" });
    if (currentChain !== sepoliaChainId) {
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: sepoliaChainId }]
            });
        } catch (switchError) {
            // If the chain is not added to MetaMask, add it
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
                alert("Please switch your wallet to Sepolia Testnet manually.");
                return false;
            }
        }
    }
    return true;
}

// ==========================================
// 2. BLOCKCHAIN SESSION STORAGE & RECOVERY
// ==========================================
async function restoreUserPackageFromBlockchain(address) {
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, miningPoolABI, provider);
        
        // Calling the status check function from the Sepolia blockchain
        const status = await contract.checkUserStatus(address);
        
        // Map the return values according to their order in the SecureMiningPool.sol file
        const activePackageId = status[0].toString();
        const packageAmount = status[1].toString();
        const isActive = status[2]; // The second index is a boolean value indicating whether the package is active (bool active)

        // If on-chain data detects an active packet, lock the data in memory to prevent a restart
        if (isActive && Number(activePackageId) > 0) {
            localStorage.setItem("activePackageId", activePackageId);
            localStorage.setItem("packageAmount", packageAmount);
            console.log("On-chain mining active state preserved securely. Package ID: " + activePackageId);
        } else {
            localStorage.removeItem("activePackageId");
            localStorage.removeItem("packageAmount");
        }
    } catch (error) {
        console.error("Session integrity query halted:", error);
    }
}


// Listen to wallet events
if (window.ethereum) {
    window.ethereum.on("accountsChanged", function (accounts) {
        if (accounts.length > 0) {
            updateWalletUI(accounts[0]);
            restoreUserPackageFromBlockchain(accounts[0]);
        } else {
            localStorage.clear();
            location.reload();
        }
    });
    window.ethereum.on("chainChanged", function () {
        location.reload(); // safest: reload page when chain changes
    });
}

// ==========================================
// 3. WALLET CONNECTION (handles typos in HTML)
// ==========================================
async function handleParticipateInEquity() {  // <-- NAMA YANG BENAR
    if (!window.ethereum) {
        return alert("Attention: Web3 Wallet not detected. Please install MetaMask!");
    }
    try {
        // 1. Force Sepolia network
        const isCorrectNetwork = await ensureSepoliaNetwork();
        if (!isCorrectNetwork) return;

        // 2. Request accounts
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (accounts.length === 0) throw new Error("No account selected");

        // 3. Update UI & sync state
        updateWalletUI(accounts[0]);
        await restoreUserPackageFromBlockchain(accounts[0]);
        showTab("packages");
    } catch (error) {
        console.error(error);
        alert("Wallet synchronization aborted: " + error.message);
    }
}

// Alias function to defend against the typo "handleParticipatIneEquity"
async function handleParticipatIneEquity() {
    return handleParticipateInEquity();
}

// ==========================================
// 4. UI HELPERS (page routing)
// ==========================================
function updateWalletUI(address) {
    const short = address.substring(0, 6) + "..." + address.substring(address.length - 4);
    ["walletStateDisplay", "wallet-status-text", "wallet-address-display"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = short;
            el.style.color = "#10b981";
        }
    });
}

async function checkAndRestoreSession() {
    if (!window.ethereum) return;
    try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
            updateWalletUI(accounts[0]);
            if (typeof restoreUserPackageFromBlockchain === "function") {
                await restoreUserPackageFromBlockchain(accounts[0]);
            }
        }
    } catch (error) {
        console.error("Session restore failed:", error);
    }
}

function switchTab(tabName) {
    const homeSection = document.getElementById("page-home") || document.getElementById("home-page");
    const helpSection = document.getElementById("page-help") || document.getElementById("help-page");
    const packagesSection = document.getElementById("page-packages") || document.getElementById("packages-page");
    const accountSection = document.getElementById("page-account") || document.getElementById("account-page");

    if (homeSection) { homeSection.classList.remove('active'); homeSection.style.display = "none"; }
    if (helpSection) { helpSection.classList.remove('active'); helpSection.style.display = "none"; }
    if (packagesSection) { packagesSection.classList.remove('active'); packagesSection.style.display = "none"; }
    if (accountSection) { accountSection.classList.remove('active'); accountSection.style.display = "none"; }

    document.querySelectorAll('.tab_bar .item').forEach(item => {
        item.classList.remove('active');
    });

    if (tabName === "home" && homeSection) {
        homeSection.classList.add('active');
        homeSection.style.display = "block";
    } else if (tabName === "help" && helpSection) {
        helpSection.classList.add('active');
        helpSection.style.display = "block";
    } else if (tabName === "packages" && packagesSection) {
        packagesSection.classList.add('active');
        packagesSection.style.display = "block";
    } else if (tabName === "account" && accountSection) {
        accountSection.classList.add('active');
        accountSection.style.display = "block";
    }

    const targetTab = document.getElementById("tab-" + tabName);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

// ==========================================
// 5. MINING HALL TELEMETRY (unchanged visual logic)
// ==========================================
function runMiningHallTelemetry() {
    const baseNodes = 5420890;
    const baseHashrate = 482.5;
    let isIncreasing = true;
    let currentPercentOffset = 2.0;

    function updateTelemetryData() {
        if (isIncreasing) {
            currentPercentOffset += 0.04;
            if (currentPercentOffset >= 3.0) { currentPercentOffset = 3.0; isIncreasing = false; }
        } else {
            currentPercentOffset -= 0.04;
            if (currentPercentOffset <= 2.0) { currentPercentOffset = 2.0; isIncreasing = true; }
        }
        let targetNodeOffset = baseNodes * (currentPercentOffset / 100);
        let microNoiseNodes = Math.floor(Math.random() * 161) - 80;
        let microNoiseHash = (Math.random() * 0.3) - 0.15;
        let finalNodes = Math.floor(baseNodes + targetNodeOffset + microNoiseNodes);
        let finalHashrate = baseHashrate + (baseHashrate * (currentPercentOffset / 100)) + microNoiseHash;

        const nodeUI = document.getElementById("active-nodes-display");
        const hashUI = document.getElementById("total-hashrate-display");
        if (nodeUI) nodeUI.innerText = finalNodes.toLocaleString("id-ID");
        if (hashUI) hashUI.innerText = finalHashrate.toFixed(1) + " TH/s";
    }

    updateTelemetryData();
    setInterval(updateTelemetryData, 3000);
    checkAndRestoreSession();
}
document.addEventListener("DOMContentLoaded", runMiningHallTelemetry);

// ==========================================
// 6. ON-CHAIN EXECUTION (PACKAGE PURCHASE)
// ==========================================
async function triggerPackagePurchase(packageId, amountUSDT) {
    try {
        const isCorrectNetwork = await ensureSepoliaNetwork();
        if (!isCorrectNetwork) return;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, miningPoolABI, signer);

        const parsedAmount = ethers.utils.parseUnits(amountUSDT.toString(), 18);
        const tx = await contract.buyPackage(packageId, parsedAmount);

        alert("Transaction broadcasting to Sepolia Testnet. Awaiting validation receipt...");
        await tx.wait();

        alert("Purchase confirmed successfully!");
        autoRedirectToTelegramCS("Pool Package Registration Tier #" + packageId, amountUSDT);
    } catch (error) {
        console.error(error);
        alert("Transaction Failed: " + error.message);
    }
}

// ==========================================
// 7. ON-CHAIN EXECUTION (WITHDRAWAL)
// ==========================================
async function executeSecureWithdrawal() {
    const destinationWallet = document.getElementById("withdrawal-target-address").value.trim();
    const amountVal = document.getElementById("withdrawal-amount-field").value;

    if (!destinationWallet || !amountVal) {
        return alert("Validation error: Destination target address and value fields are mandatory.");
    }
    if (!ethers.utils.isAddress(destinationWallet)) {
        return alert("Validation error: Invalid Web3 ledger address format.");
    }
    if (isNaN(amountVal) || Number(amountVal) <= 0) {
        return alert("Validation error: Amount must be a positive number.");
    }

    try {
        const isCorrectNetwork = await ensureSepoliaNetwork();
        if (!isCorrectNetwork) return;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(contractAddress, miningPoolABI, signer);

        const parsedAmount = ethers.utils.parseUnits(amountVal.toString(), 18);
        const tx = await contract.withdrawEarnings(destinationWallet, parsedAmount);

        alert("Withdrawal broadcasting to Sepolia. Awaiting validation...");
        await tx.wait();
        alert("Withdrawal confirmed! Funds sent to " + destinationWallet);
    } catch (error) {
        console.error(error);
        alert("Withdrawal Failed: " + error.message);
    }
}

// ==========================================
// 8. TELEGRAM REDIRECT (kept for compatibility)
// ==========================================
function autoRedirectToTelegramCS(packageName, amount) {
    const message = encodeURIComponent(
        "Hi, I just registered for " + packageName + " with " + amount + " USDT. Please verify my pool access."
    );
    window.open(telegramSupportLink + "?text=" + message, "_blank");
}
