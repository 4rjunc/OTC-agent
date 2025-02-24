const TelegramBot = require('node-telegram-bot-api');
const { ethers } = require('ethers');
require('dotenv').config();

// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Avalanche Fuji testnet configuration
const provider = new ethers.providers.JsonRpcProvider('https://api.avax-test.network/ext/bc/C/rpc');
let botWallet;

try {
    botWallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);
    console.log('Bot wallet successfully initialized');
} catch (error) {
    console.error('Failed to initialize bot wallet:', error);
    process.exit(1);
}

// Store swap requests
const swapRequests = new Map();

// Add basic message logging
bot.on('message', (msg) => {
    console.log('Received message:', {
        from: msg.from.username || msg.from.first_name,
        text: msg.text,
        chat_id: msg.chat.id
    });
});

// Add a simple /start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;
    console.log(`User ${username} started the bot`);
    
    const welcomeMessage = `Welcome to the Crypto Swap Bot!\n\n` +
        `Available commands:\n` +
        `/swap wallet1_address wallet2_address - Start a new swap\n` +
        `/info - Check current swap status\n` +
        `/swapit - Execute the swap when both assets are received\n\n` +
        `Bot wallet address: ${botWallet.address}`;
    
    bot.sendMessage(chatId, welcomeMessage);
});

// Handle /swap command
bot.onText(/\/swap (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;
    
    console.log(`User ${username} triggered /swap command with params:`, match[1]);
    
    const addresses = match[1].trim().split(' ');
    
    if (addresses.length !== 2) {
        const errorMsg = 'Please provide exactly 2 wallet addresses.\nFormat: /swap wallet1_address wallet2_address';
        console.log(`Error: ${errorMsg}`);
        bot.sendMessage(chatId, errorMsg);
        return;
    }

    // Validate addresses
    try {
        addresses.forEach(addr => {
            const checksumAddress = ethers.utils.getAddress(addr);
            console.log(`Validated address: ${checksumAddress}`);
        });
    } catch (error) {
        const errorMsg = 'Invalid wallet address provided. Please check the addresses.';
        console.log(`Error: ${errorMsg}`, error);
        bot.sendMessage(chatId, errorMsg);
        return;
    }

    // Store swap request
    swapRequests.set(chatId, {
        wallet1: addresses[0],
        wallet2: addresses[1],
        assets: {
            wallet1: null,
            wallet2: null
        },
        confirmations: {
            wallet1: false,
            wallet2: false
        }
    });

    console.log(`Created swap request for chat ${chatId}:`, swapRequests.get(chatId));

    const message = `Swap request initialized!\n\n` +
        `Wallet 1: ${addresses[0]}\n` +
        `Wallet 2: ${addresses[1]}\n\n` +
        `Please send your assets to the bot wallet:\n` +
        `${botWallet.address}\n\n` +
        `The bot will monitor for incoming transactions.`;

    bot.sendMessage(chatId, message);
});

// Listen for incoming transactions
provider.on('block', async (blockNumber) => {
    console.log(`Processing block ${blockNumber}`);
    try {
        const block = await provider.getBlock(blockNumber, true);
        
        for (const tx of block.transactions) {
            if (tx.to?.toLowerCase() === botWallet.address.toLowerCase()) {
                console.log(`Received transaction in block ${blockNumber}:`, tx.hash);
                
                // Process the transaction
                for (const [chatId, request] of swapRequests.entries()) {
                    if (tx.from.toLowerCase() === request.wallet1.toLowerCase()) {
                        request.assets.wallet1 = {
                            amount: tx.value,
                            txHash: tx.hash
                        };
                        await handleAssetReceived(chatId, 'wallet1', tx);
                    } else if (tx.from.toLowerCase() === request.wallet2.toLowerCase()) {
                        request.assets.wallet2 = {
                            amount: tx.value,
                            txHash: tx.hash
                        };
                        await handleAssetReceived(chatId, 'wallet2', tx);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error processing block:', error);
    }
});

// Add /info command to show received assets
bot.onText(/\/info/, async (msg) => {
    const chatId = msg.chat.id;
    const request = swapRequests.get(chatId);
    
    if (!request) {
        bot.sendMessage(chatId, 'No active swap request found. Start with /swap command first.');
        return;
    }

    const wallet1Assets = request.assets.wallet1 
        ? `${ethers.utils.formatEther(request.assets.wallet1.amount)} AVAX\nTx: ${request.assets.wallet1.txHash}`
        : 'No assets received yet';
    
    const wallet2Assets = request.assets.wallet2
        ? `${ethers.utils.formatEther(request.assets.wallet2.amount)} AVAX\nTx: ${request.assets.wallet2.txHash}`
        : 'No assets received yet';

    const message = `Current Swap Status:\n\n` +
        `Wallet 1 (${request.wallet1}):\n${wallet1Assets}\n\n` +
        `Wallet 2 (${request.wallet2}):\n${wallet2Assets}\n\n` +
        `Bot wallet: ${botWallet.address}`;

    bot.sendMessage(chatId, message);
});

// Modify handleAssetReceived function
async function handleAssetReceived(chatId, walletType, tx) {
    try {
        const request = swapRequests.get(chatId);
        const amount = ethers.utils.formatEther(tx.value);
        
        console.log(`Processing received asset from ${walletType}:`, {
            amount,
            txHash: tx.hash
        });

        const assetMessage = `Received Asset Details:\n\n` +
            `From: ${walletType === 'wallet1' ? 'Wallet 1' : 'Wallet 2'}\n` +
            `Amount: ${amount} AVAX\n` +
            `Transaction: ${tx.hash}\n` +
            `\nUse /info to see all received assets`;

        await bot.sendMessage(chatId, assetMessage);

        // Check if both assets received
        if (request.assets.wallet1 && request.assets.wallet2) {
            await bot.sendMessage(
                chatId,
                'Both assets received!\nUse /swapit to execute the swap.'
            );
        }
    } catch (error) {
        console.error('Error handling received asset:', error);
    }
}

// Add /swapit command to execute the swap
bot.onText(/\/swapit/, async (msg) => {
    const chatId = msg.chat.id;
    const request = swapRequests.get(chatId);
    
    if (!request) {
        bot.sendMessage(chatId, 'No active swap request found. Start with /swap command first.');
        return;
    }

    if (!request.assets.wallet1 || !request.assets.wallet2) {
        bot.sendMessage(chatId, 'Cannot execute swap. Waiting for assets from both wallets.\nUse /info to check status.');
        return;
    }

    console.log(`Executing swap for chat ${chatId}`);
    try {
        // Send assets to respective wallets
        const tx1 = await botWallet.sendTransaction({
            to: request.wallet2,
            value: request.assets.wallet1.amount,
            gasLimit: 21000
        });

        const tx2 = await botWallet.sendTransaction({
            to: request.wallet1,
            value: request.assets.wallet2.amount,
            gasLimit: 21000
        });

        console.log('Swap transactions sent:', {
            tx1: tx1.hash,
            tx2: tx2.hash
        });

        const swapMessage = `Swap completed!\n\n` +
            `${ethers.utils.formatEther(request.assets.wallet1.amount)} AVAX sent to Wallet 2\n` +
            `Transaction: ${tx1.hash}\n\n` +
            `${ethers.utils.formatEther(request.assets.wallet2.amount)} AVAX sent to Wallet 1\n` +
            `Transaction: ${tx2.hash}`;

        await bot.sendMessage(chatId, swapMessage);

        // Clear the swap request
        swapRequests.delete(chatId);
        
    } catch (error) {
        console.error('Error executing swap:', error);
        await bot.sendMessage(
            chatId,
            'Error executing swap. Please try again with /swapit'
        );
    }
});

// Handle errors
bot.on('error', (error) => {
    console.error('Telegram Bot Error:', error);
});

// Startup message
console.log('Bot started on Avalanche Fuji testnet...');
console.log('Bot wallet address:', botWallet.address);
console.log('Monitoring for incoming transactions...'); 