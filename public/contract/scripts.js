// Globals
// ========================================================
/**
 * Contract deployed to mumbai testnet
 * - see https://mumbai.polygonscan.com/address/0x7Bd54062eFa363A97dC20f404825597455E93582
 */
const CONTRACT_ADDRESS = '0x7Bd54062eFa363A97dC20f404825597455E93582';

/**
 * ABI needed to interpret how to interact with the contract
 */
const CONTRACT_ABI = [
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_greeting",
                "type": "string"
            }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": false,
                "internalType": "address",
                "name": "sender",
                "type": "address"
            },
            {
                "indexed": false,
                "internalType": "string",
                "name": "message",
                "type": "string"
            }
        ],
        "name": "NewGreeting",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getGreeting",
        "outputs": [
            {
                "internalType": "string",
                "name": "",
                "type": "string"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {
                "internalType": "string",
                "name": "_greeting",
                "type": "string"
            }
        ],
        "name": "setGreeting",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

/**
 * keep track of wallet address
 */
let WALLET_ADDRESS = '';

/**
 * keep track of current connected chain id
 */
let CHAIN_ID = '';

// Helpers
// ========================================================
/**
 * Helper function that converts hex values to strings
 * @param {*} hex 
 * @returns 
 */
const hex2ascii = (hex) => {
    console.group('hex2ascii');
    console.log({ hex });
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        const v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
    }
    console.groupEnd();
    return str;
};

/**
 * parses eth_getLogs response payload and formats it into a semi-readable format
 * @param {*} logs 
 * @returns 
 */
const parseEthLogs = (logs) => {
    console.group('parseEthLogs');
    console.log({ logs });

    // Get all events from ABI file
    const events = CONTRACT_ABI.filter(obj => obj.type ? obj.type === "event" : false)
    console.log({ events });

    const hashedEvents = events.map(event => {
        const inputs = event.inputs?.map(input => input.type);
        const fullEventAndInputs = `${event.name}(${inputs?.length > 0 ? inputs.join(',') : ''})`;
        return {
            name: fullEventAndInputs,
            hashed: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(fullEventAndInputs)),
            inputs,
            indexed: event.inputs?.filter(input => input.indexed),
            unindexed: event.inputs?.filter(input => !input.indexed),
        };
    });
    console.log({ hashedEvents });

    // Ethers.js AbiCoder is needed to avoid more code
    const decoder = new ethers.utils.AbiCoder();

    // Get all data logs and format them
    const decodedLogs = logs?.map((log, index) => {
        const toDecode = hashedEvents.find(hEvent => hEvent.hashed === log?.topics?.[0]);
        const decodedDataRaw = decoder.decode(toDecode?.unindexed, log.data);
        const decodedData = toDecode?.unindexed?.map((input, i) => {
            return {
                [input.name]: decodedDataRaw[i]
            }
        });

        return {
            ...log,
            blockNumber: parseInt(log.blockNumber, 16),
            data: decodedData,
            topics: log?.topics?.map(topic => hashedEvents.find(event => event.hashed === topic)),
            transactionHash: `https://mumbai.polygonscan.com/tx/${log.transactionHash}`,
            transactionIndex: parseInt(log.transactionIndex, 16),
            logIndex: parseInt(log.logIndex, 16),
        }
    });
    console.log({ decodedLogs });

    console.groupEnd();
    return decodedLogs;
};

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
        WALLET_ADDRESS = accounts[0];
        
        CHAIN_ID = await window.ethereum.request({ method: 'net_version' });
        console.log({ CHAIN_ID });

        codeWalletConnect.innerHTML = `wallet address:\n${WALLET_ADDRESS}\n\nchain id:\n${CHAIN_ID}`;

        // show connected section
        const sectionConnected = document.getElementById('section-connected');
        sectionConnected.removeAttribute('style');

        // Add contract address to input
        const inputContractAddress = document.getElementById('input-contract-address');
        inputContractAddress.value = CONTRACT_ADDRESS;
    } catch (error) {
        console.log({ error });
        codeWalletConnect.innerHTML =  error?.message ?? 'Unknown wallet connection error.'
    }

    console.groupEnd();
};

/**
 * 
 * @param {*} event 
 */
const onClickContractRead = async (event) => {
    console.group('onClickContractRead');
    event.preventDefault();

    // Reset & Set Loading State
    const codeContractRead = document.getElementById('code-contract-read');
    codeContractRead.innerHTML = '(Loading...)';
    const button = event.target;
    button.setAttribute('disabled', true);

    // Setup Interface + Encode Function
    const GetGreeting = CONTRACT_ABI.find(i => i.name === 'getGreeting');
    const interface = new ethers.utils.Interface([GetGreeting]);
    const encodedFunction = interface.encodeFunctionData(`${GetGreeting.name}`);
    console.log({ encodedFunction });

    // Request getGreeting
    try {
        const result = await window.ethereum.request({
            method: 'eth_call', params: [{
                to: CONTRACT_ADDRESS, "data": encodedFunction
            }, "latest"]
        });
        codeContractRead.innerHTML = `${result}\n\n// ${hex2ascii(result)}`;
    } catch (error) {
        console.log({ error });
        codeContractRead.innerHTML = error?.message ?? 'Unknown contract read error.';
    }

    button.removeAttribute('disabled');
    console.groupEnd();
};

/**
 * 
 * @param {*} event 
 */
const onSubmitContractWrite = async (event) => {
    event.preventDefault();
    console.group('onSubmitContractWrite');
    console.log({ greeting: event.currentTarget.greeting.value });

    // Reset & Set Loading State
    const codeContractWrite = document.getElementById('code-contract-write');
    codeContractWrite.innerHTML = '(Loading...)';
    const button = document.querySelector(`#${event.currentTarget.id} button`);
    button.setAttribute('disabled', true);

    // Setup Interface + Encode Function
    const SetGreeting = CONTRACT_ABI.find(i => i.name === 'setGreeting');
    const interface = new ethers.utils.Interface([SetGreeting]);
    const encodedFunction = interface.encodeFunctionData(`${SetGreeting.name}`, [event.currentTarget.greeting.value]);
    console.log({ encodedFunction });

    // Request setGreeting
    try {
        const result = await window.ethereum.request({
            method: 'eth_sendTransaction', params: [{
                from: WALLET_ADDRESS,
                to: CONTRACT_ADDRESS,
                "data": encodedFunction
            }, "latest"]
        });
        codeContractWrite.innerHTML = `${result}\n\n// https://mumbai.polygonscan.com/tx/${result}`;
    } catch (error) {
        console.log({ error });
        codeContractWrite.innerHTML = error?.message ?? 'Unknown contract write error.';
    }

    button.removeAttribute('disabled');
    console.groupEnd();
};

/**
 * 
 * @param {*} event 
 */
const onSubmitContractLogs = async (event) => {
    event.preventDefault();
    console.group('onSubmitContractLogs');

    // Inputs
    const address = CONTRACT_ADDRESS;
    const fromBlock = event.target.fromBlock.value;
    const toBlock = event.target.toBlock.value;
    const topics = event.target.topics.value;

    console.log({ address });
    console.log({ fromBlock });
    console.log({ toBlock });
    console.log({ topics });

    // Reset & Set Loading State
    const codeContractLogs = document.getElementById('code-contract-logs');
    codeContractLogs.innerHTML = '(Loading...)';
    const button = document.querySelector(`#${event.currentTarget.id} button`);
    button.setAttribute('disabled', true);

    // Request logs
    try {
        // Encode from / to
        const from = fromBlock === 'latest' ? fromBlock : `0x${parseInt(fromBlock).toString(16)}`;
        const to = toBlock === 'latest' ? toBlock : `0x${parseInt(toBlock).toString(16)}`;
        console.log({ from });
        console.log({ to });

        // Encode Function
        let topicsArray = JSON.parse(topics);
        if (topicsArray.length > 0) {
            topicsArray = topicsArray.map(i => ethers.utils.keccak256(ethers.utils.toUtf8Bytes(i)))
        }
        console.log({ topicsArray });

        const result = await window.ethereum.request({
            method: 'eth_getLogs', params: [{
                fromBlock: from,
                toBlock: to,
                address,
                topics: topicsArray
            }]
        });

        // Many thanks to William Schwab's (@w.s.schwab) article for decoding:
        // https://medium.com/linum-labs/everything-you-ever-wanted-to-know-about-events-and-logs-on-ethereum-fec84ea7d0a5
        codeContractLogs.innerHTML = `${JSON.stringify(result, null, ' ')}\n\n// DECODED:\n${JSON.stringify(parseEthLogs(result), null, ' ')}`;
    } catch (error) {
        console.log({ error });
        codeContractLogs.innerHTML = error?.data?.message ?? error?.message ?? 'Unknown contract logs error.';
    }

    button.removeAttribute('disabled');
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
    const buttonContractRead = document.getElementById('button-contract-read');
    const formContractWrite = document.getElementById('form-contract-write');
    const formContractLogs = document.getElementById('form-contract-logs');

    // Events
    buttonWalletConnect.addEventListener('click', onClickWalletConnect);
    buttonContractRead.addEventListener('click', onClickContractRead);
    formContractWrite.addEventListener('submit', onSubmitContractWrite);
    formContractLogs.addEventListener('submit', onSubmitContractLogs);
};