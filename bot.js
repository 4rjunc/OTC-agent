import TelegramBot from 'node-telegram-bot-api';
import { ethers } from 'ethers';
import 'dotenv/config'
import { analyzeTransaction, analyzeWallet, formatSwapTransactions } from './prompt.js';
import { walletBalances } from './moralis.js';


// Initialize bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Avalanche Fuji testnet configuration
const RPC = process.env.RPC;
const provider = new ethers.providers.JsonRpcProvider(RPC);
let botWallet;

//transfer erc20Abi
const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// User states for conversation flow
const userStates = new Map();

// Available tokens for selection
const availableTokens = ["USDC", "EURC"];

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

  const welcomeMessage = `Welcome to the Crypto Swap Bot!\n\nThis bot helps you swap tokens with other users securely.\n\nBot wallet address: ${botWallet.address}`;

  // Main menu buttons
  const mainMenuOptions = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 Create New Swap", callback_data: "create_swap" }],
        [{ text: "ℹ️ Check Swap Status", callback_data: "check_status" }],
        [{ text: "❓ Help", callback_data: "help" }]
      ]
    }
  };

  bot.sendMessage(chatId, welcomeMessage, mainMenuOptions);
});

// Handle callback queries from inline buttons
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const username = callbackQuery.from.username || callbackQuery.from.first_name;
  const data = callbackQuery.data;
  
  // Answer the callback query to remove the loading state
  bot.answerCallbackQuery(callbackQuery.id);
  
  // Main menu options
  if (data === "create_swap") {
    // Start the swap creation flow
    userStates.set(chatId, { 
      state: "awaiting_wallet", 
      username: username,
      data: {}
    });
    
    bot.sendMessage(chatId, "Please enter your wallet address:");
  } 
  else if (data === "check_status") {
    // Check current swap status
    const orderData = swapRequests.get(chatId);

    if (!orderData) {
      bot.sendMessage(chatId, 'No active order request found. Create a new swap first.');
      return;
    }

    // Moralis api call 
    const infoReport = await analyzeWallet(orderData, walletBalances);
    console.log("infoReport", infoReport);

    const message = `Order Status: ${infoReport ? "✅ Valid" : "❌ Invalid"}`;
    
    const statusButtons = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Approve Swap", callback_data: "approve_swap" }],
          [{ text: "Cancel", callback_data: "cancel_swap" }],
          [{ text: "Back to Main Menu", callback_data: "main_menu" }]
        ]
      }
    };

    bot.sendMessage(chatId, message, statusButtons);

    const users = Object.keys(orderData);
    const approvals = {};
    users.forEach(userId => {
      approvals[userId] = false;
    });

    // Store the approvals in your swapRequests map alongside the request data
    swapRequests.set(chatId, {
      orderData: orderData,
      approvals: approvals,
      users: users
    });
  }
  else if (data === "help") {
    const helpMessage = `*How to use this bot:*\n\n` +
      `1. Click on "Create New Swap" to start a new swap\n` +
      `2. Enter your wallet address\n` +
      `3. Select the token you want to send\n` +
      `4. Enter the amount you want to send\n` +
      `5. Select the token you want to receive\n` +
      `6. Enter the amount you want to receive\n` +
      `7. Send your tokens to the bot wallet: ${botWallet.address}\n` +
      `8. Both parties must approve the swap\n` +
      `9. The bot will execute the swap automatically`;
    
    const backButton = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Back to Main Menu", callback_data: "main_menu" }]
        ]
      }
    };
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: "Markdown", ...backButton });
  }
  else if (data === "main_menu") {
    // Return to main menu
    const mainMenuOptions = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Create New Swap", callback_data: "create_swap" }],
          [{ text: "ℹ️ Check Swap Status", callback_data: "check_status" }],
          [{ text: "❓ Help", callback_data: "help" }]
        ]
      }
    };
    
    bot.sendMessage(chatId, "Main Menu:", mainMenuOptions);
  }
  else if (data === "approve_swap") {
    // Get the current swap request
    const swapRequest = swapRequests.get(chatId);
    
    if (!swapRequest) {
      bot.sendMessage(chatId, "No active swap request found.");
      return;
    }

    // Check if user already approved
    if (swapRequest.approvals[username] === true) {
      bot.sendMessage(chatId, "You've already approved this swap.");
      return;
    }
    
    // Mark this user as approved
    swapRequest.approvals[username] = true;

    // Check if all users have approved
    const allApproved = Object.values(swapRequest.approvals).every(approved => approved);

    if (allApproved) {
      // Execute the swap
      await bot.sendMessage(chatId, "⏰ Wait for a minute");
      try {
        const swapData = await formatSwapTransactions(swapRequest["orderData"]);
        console.log("swapData", swapData);
        if (!swapData) throw new Error("Failed to format swap data.");

        const txHashes = [];
        for (const key in swapData) {
          const { recipientWallet, sendingToken, sendingAmount } = swapData[key];
          const amount = ethers.utils.parseUnits(sendingAmount.toString(), 6);
          const tokenContract = new ethers.Contract(sendingToken, erc20Abi, botWallet);
          const tx = await tokenContract.transfer(recipientWallet, amount);
          await tx.wait();
          txHashes.push(`Tx ${key}: ${tx.hash}`);
        }

        const swapMessage = `✅ Swap Completed!\n\n` + txHashes.join("\n");
        await bot.sendMessage(chatId, swapMessage);
        swapRequests.delete(chatId);
        
        // Return to main menu
        const mainMenuOptions = {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Create New Swap", callback_data: "create_swap" }],
              [{ text: "❓ Help", callback_data: "help" }]
            ]
          }
        };
        
        bot.sendMessage(chatId, "What would you like to do next?", mainMenuOptions);
      } catch (error) {
        console.error('Error executing swap:', error);
        await bot.sendMessage(chatId, '❌ Error executing swap. Please try again.');
      }
    } else {
      // Let the user know their approval was recorded
      const approvedUsers = Object.entries(swapRequest.approvals)
        .filter(([_, approved]) => approved)
        .map(([userId, _]) => userId)
        .length;

      const approvalMessage = `Swap approval: ${approvedUsers}/${swapRequest.users.length} users have approved.`;
      
      const approvalButtons = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Back to Main Menu", callback_data: "main_menu" }]
          ]
        }
      };
      
      bot.sendMessage(chatId, approvalMessage, approvalButtons);
    }
  }
  else if (data === "cancel_swap") {
    // Cancel the swap
    swapRequests.delete(chatId);
    
    const cancelMessage = "Swap cancelled.";
    const mainMenuButton = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Back to Main Menu", callback_data: "main_menu" }]
        ]
      }
    };
    
    bot.sendMessage(chatId, cancelMessage, mainMenuButton);
  }
  // Token selection handlers
  else if (data.startsWith("send_token_")) {
    const token = data.replace("send_token_", "");
    const userState = userStates.get(chatId);
    
    if (userState) {
      userState.data.sendingToken = token;
      userState.state = "awaiting_send_amount";
      userStates.set(chatId, userState);
      
      bot.sendMessage(chatId, `How much ${token} do you want to send?`);
    }
  }
  else if (data.startsWith("receive_token_")) {
    const token = data.replace("receive_token_", "");
    const userState = userStates.get(chatId);
    
    if (userState) {
      userState.data.requestedToken = token;
      userState.state = "awaiting_receive_amount";
      userStates.set(chatId, userState);
      
      bot.sendMessage(chatId, `How much ${token} do you want to receive?`);
    }
  }
  else if (data === "confirm_swap") {
    const userState = userStates.get(chatId);
    
    if (userState && userState.state === "confirming") {
      const orderData = userState.data;
      
      // Create swap request
      if (!swapRequests.has(chatId)) {
        swapRequests.set(chatId, {});
      }
      
      // Save order under the username
      swapRequests.get(chatId)[username] = orderData;
      
      console.log(`Created swap request for chat ${chatId}:`, swapRequests.get(chatId));
      
      const message = `🔄 *Order Request Initialized!*\n\n` +
        `👤 *User:* ${username}\n` +
        `💼 *Wallet:* ${orderData.wallet}\n\n` +
        `📤 *Sending:* ${orderData.sendingAmount} ${orderData.sendingToken}\n` +
        `📥 *Requesting:* ${orderData.requestedAmount} ${orderData.requestedToken}\n\n` +
        `⚡ *Please send your assets to the bot wallet:*\n` +
        `📍 ${botWallet.address}\n\n` +
        `⏳ *The bot will monitor for incoming transactions and confirm once both parties have sent their assets.*`;
      
      const swapCreatedButtons = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Check Status", callback_data: "check_status" }],
            [{ text: "Back to Main Menu", callback_data: "main_menu" }]
          ]
        }
      };
      
      bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...swapCreatedButtons });
      
      // Clear user state
      userStates.delete(chatId);
    }
  }
  else if (data === "cancel_creation") {
    // Cancel the swap creation process
    userStates.delete(chatId);
    
    const cancelMessage = "Swap creation cancelled.";
    const mainMenuButton = {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Back to Main Menu", callback_data: "main_menu" }]
        ]
      }
    };
    
    bot.sendMessage(chatId, cancelMessage, mainMenuButton);
  }
});

// Handle text messages for the conversation flow
bot.on('message', (msg) => {
  if (!msg.text) return;
  
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;
  const userState = userStates.get(chatId);
  
  // If no active state or the message is a command, ignore
  if (!userState || msg.text.startsWith('/')) return;
  
  switch (userState.state) {
    case "awaiting_wallet":
      try {
        // Validate wallet address
        const checksumAddress = ethers.utils.getAddress(msg.text.trim());
        userState.data.wallet = checksumAddress;
        userState.state = "awaiting_send_token";
        userStates.set(chatId, userState);
        
        // Create token selection buttons
        const tokenButtons = {
          reply_markup: {
            inline_keyboard: availableTokens.map(token => [
              { text: token, callback_data: `send_token_${token}` }
            ])
          }
        };
        
        bot.sendMessage(chatId, "Which token do you want to send?", tokenButtons);
      } catch (error) {
        bot.sendMessage(chatId, "Invalid wallet address. Please enter a valid Ethereum address:");
      }
      break;
      
    case "awaiting_send_amount":
      const sendAmount = parseFloat(msg.text.trim());
      
      if (isNaN(sendAmount) || sendAmount <= 0) {
        bot.sendMessage(chatId, "Please enter a valid amount (must be a positive number):");
        return;
      }
      
      userState.data.sendingAmount = sendAmount;
      userState.state = "awaiting_receive_token";
      userStates.set(chatId, userState);
      
      // Create token selection buttons for receiving
      const receiveTokenButtons = {
        reply_markup: {
          inline_keyboard: availableTokens
            .filter(token => token !== userState.data.sendingToken) // Filter out the sending token
            .map(token => [
              { text: token, callback_data: `receive_token_${token}` }
            ])
        }
      };
      
      bot.sendMessage(chatId, "Which token do you want to receive?", receiveTokenButtons);
      break;
      
    case "awaiting_receive_amount":
      const receiveAmount = parseFloat(msg.text.trim());
      
      if (isNaN(receiveAmount) || receiveAmount <= 0) {
        bot.sendMessage(chatId, "Please enter a valid amount (must be a positive number):");
        return;
      }
      
      userState.data.requestedAmount = receiveAmount;
      userState.state = "confirming";
      userStates.set(chatId, userState);
      
      // Show summary and confirmation buttons
      const summary = `*Swap Summary:*\n\n` +
        `💼 *Wallet:* ${userState.data.wallet}\n` +
        `📤 *Sending:* ${userState.data.sendingAmount} ${userState.data.sendingToken}\n` +
        `📥 *Receiving:* ${userState.data.requestedAmount} ${userState.data.requestedToken}\n\n` +
        `Please confirm this swap:`;
      
      const confirmButtons = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Confirm", callback_data: "confirm_swap" }],
            [{ text: "❌ Cancel", callback_data: "cancel_creation" }]
          ]
        }
      };
      
      bot.sendMessage(chatId, summary, { parse_mode: "Markdown", ...confirmButtons });
      break;
  }
});

// Listen for incoming transactions
provider.on('block', async (blockNumber) => {
  console.log(`Processing block ${blockNumber}`);
  try {
    const block = await provider.getBlock(blockNumber, true);

    for (const tx of block.transactions) {
      if (tx.to?.toLowerCase() === botWallet.address.toLowerCase()) {
        console.log(`Received transaction in block ${blockNumber}:`, tx.hash);
      }
    }
  } catch (error) {
    console.error('Error processing block:', error);
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

