// Functions
// ========================================================
/**
 * Connects wallet to site
 */
const onClickWalletConnect = async () => {
    console.group('onClickWalletConnect');

    // Get the element we want to output the result of connecting the wallet
    const codeWalletConnect = document.getElementById('code-wallet-connect');

    try {
        // eth_requestAccounts is a MetaMask RPC API request that will
        // prompt the wallet to connect or if already has connected successfully connect
        // - see https://metamask.github.io/api-playground/api-documentation/
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log({ accounts });
        
        const chainId = await window.ethereum.request({ method: 'net_version' });
        console.log({ chainId });

        codeWalletConnect.innerHTML = `wallet address:\n${accounts[0]}\n\nchain id:\n${chainId}`;
    } catch (error) {
        console.log({ error });
        codeWalletConnect.innerHTML =  error?.message ?? 'Unknown wallet connection error.'
    }

    console.groupEnd();
};

// Initial Script Loaded On Window Loaded
// ========================================================
/**
 * Init - Runs as soon as window is loaded
 */
window.onload = () => {
    // Elements
    const buttonWalletConnect = document.getElementById('button-wallet-connect');

    // Events
    buttonWalletConnect.addEventListener('click', onClickWalletConnect);
};