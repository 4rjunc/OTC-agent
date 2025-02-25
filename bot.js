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
    `/myorder user1_address I am sending 1 USDC for 1 EURC - Start a new swap\n` +
    `/info - Check current swap status\n` +
    `/ok - Execute the order when both assets are received\n\n` +
    `Bot wallet address: ${botWallet.address}`;

  bot.sendMessage(chatId, welcomeMessage);
});

// Handle /myorder command
bot.onText(/\/myorder (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name;

  console.log(`User ${username} triggered /myorder command with params:`, match[1]);

  const orderrequest = match[1].trim().split(' ');
  console.log("orderrequest", orderrequest)

  const orderJSON = await analyzeTransaction(orderrequest)
  console.log("orderJSON", orderJSON)

  //if (addresses.length !== 2) {
  //  const errorMsg = 'Please provide exactly 2 wallet addresses.\nFormat: /swap wallet1_address wallet2_address';
  //  console.log(`Error: ${errorMsg}`);
  //  bot.sendMessage(chatId, errorMsg);
  //  return;
  //}

  //// Validate addresses
  //try {
  //  addresses.forEach(addr => {
  //    const checksumAddress = ethers.utils.getAddress(addr);
  //    console.log(`Validated address: ${checksumAddress}`);
  //  });
  //} catch (error) {
  //  const errorMsg = 'Invalid wallet address provided. Please check the addresses.';
  //  console.log(`Error: ${errorMsg}`, error);
  //  bot.sendMessage(chatId, errorMsg);
  //  return;
  //}

  if (!swapRequests.has(chatId)) {
    swapRequests.set(chatId, {}); // Initialize as an empty object for users
  }
  // Save order under the username inside the chat's swapRequests object
  swapRequests.get(chatId)[username] = orderJSON;

  console.log(`Created swap request for chat ${chatId}:`, swapRequests.get(chatId));


  const message = `🔄 *Order Request Initialized!*\n\n` +
    `👤 *User:* ${username}\n` +
    `💼 *Wallet:* ${orderJSON.wallet}\n\n` +
    `📤 *Sending:* ${orderJSON.sendingAmount} ${orderJSON.sendingToken}\n` +
    `📥 *Requesting:* ${orderJSON.requestedAmount} ${orderJSON.requestedToken}\n\n` +
    `⚡ *Please send your assets to the bot wallet:*\n` +
    `📍 ${botWallet.address}\n\n` +
    `⏳ *The bot will monitor for incoming transactions and confirm once both parties have sent their assets.*`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

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

  //console.log(`Created swap request for chat ${chatId}:`, swapRequests.get(chatId));
  const message = `🔄 *Order Request Initialized!*\n\n` +
    `👤 *User:* ${username}\n` +
    `💼 *Wallet:* ${orderJSON.wallet}\n\n` +
    `📤 *Sending:* ${orderJSON.sendingAmount} ${orderJSON.sendingToken}\n` +
    `📥 *Requesting:* ${orderJSON.requestedAmount} ${orderJSON.requestedToken}\n\n` +
    `⚡ *Please send your assets to the bot wallet:*\n` +
    `📍 ${botWallet.address}\n\n` +
    `⏳ *The bot will monitor for incoming transactions and confirm once both parties have sent their assets.*`;

  bot.sendMessage(chatId, message, { parse_mode: "Markdown" });

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

// Add /info command to show received assets
bot.onText(/\/info/, async (msg) => {
  const chatId = msg.chat.id;
  const orderData = swapRequests.get(chatId);

  if (!orderData) {
    bot.sendMessage(chatId, 'No active order request found. Start with /myorder command first.');
    return;
  }

  // Moralis api call 
  // FIX: reuturns empy array
  //const walletBalances = await getWalletTokenBalance(botWallet.address)
  const infoReport = await analyzeWallet(orderData, walletBalances);

  console.log("infoReport", infoReport)

  const message = `Order Status: ${infoReport ? "✅ Valid" : "❌ Invalid"}`

  bot.sendMessage(chatId, message); bot.sendMessage(chatId, message);

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

  // Send a message with approval buttons
  sendApprovalButtons(chatId, users);
});

function sendApprovalButtons(chatId, users) {
  const buttons = {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Approve Swap", callback_data: "approve_swap" }],
        [{ text: "Cancel", callback_data: "cancel_swap" }]
      ]
    }
  };

  bot.sendMessage(chatId, "Both users must approve this swap. Click the button below to approve:", buttons);
}

// Handle callback queries from inline buttons
bot.on('callback_query', async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const username = callbackQuery.from.username || callbackQuery.from.first_name;
  const data = callbackQuery.data;
  // Get the current swap request
  const swapRequest = swapRequests.get(chatId);
  console.log("swapRequest", swapRequest)
  if (!swapRequest) {
    bot.answerCallbackQuery(callbackQuery.id, "No active swap request found.");
    return;
  }

  if (data === "approve_swap") {
    //// Check if this user is part of the swap
    //if (!swapRequest.users.includes(userId)) {
    //  bot.answerCallbackQuery(callbackQuery.id, "You're not part of this swap.");
    //  return;
    //}

    //Checks if user already done the voting
    if (swapRequest.approvals[username] === true) {
      bot.answerCallbackQuery(callbackQuery.id, "You've already approved this swap.");
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
        console.log("swapData", swapData)
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
      } catch (error) {
        console.error('Error executing swap:', error);
        await bot.sendMessage(chatId, '❌ Error executing swap. Please try again with /swap');
      }
    } else {
      // Let the user know their approval was recorded
      bot.answerCallbackQuery(callbackQuery.id, "Your approval has been recorded. Waiting for other user.");

      // Update the message to show who has approved
      const approvedUsers = Object.entries(swapRequest.approvals)
        .filter(([_, approved]) => approved)
        .map(([userId, _]) => userId)
        .length;

      await bot.editMessageText(
        `Swap approval: ${approvedUsers}/${swapRequest.users.length} users have approved.`,
        {
          chat_id: chatId,
          message_id: msg.message_id,
          reply_markup: msg.reply_markup
        }
      );
    }
  } else if (data === "cancel_swap") {
    // Cancel the swap
    swapRequests.delete(chatId);
    await bot.sendMessage(chatId, "Swap cancelled.");
    bot.answerCallbackQuery(callbackQuery.id, "Swap cancelled.");
  }
});

// Add /ok command to execute the order
bot.onText(/\/ok/, async (msg) => {
  // TODO: Only execute if both users agree
  const chatId = msg.chat.id;
  const request = swapRequests.get(chatId);

  if (!request) {
    bot.sendMessage(chatId, 'No active orders request found. Start with /myorder command first.');
    return;
  }

  const waitMessage = ` ⏰ Wait for a minute`;
  await bot.sendMessage(chatId, waitMessage);

  try {

    console.log("orderData", request)
    const swapData = await formatSwapTransactions(request);
    console.log("swapData", swapData)
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
  } catch (error) {
    console.error('Error executing swap:', error);
    await bot.sendMessage(chatId, '❌ Error executing swap. Please try again with /swapit');
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

