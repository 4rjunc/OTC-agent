const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Replace 'YOUR_BOT_TOKEN' with the token you got from BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Console message when bot starts
console.log('Bot has been started...');

// Handle /start command with users
bot.onText(/\/start($|\s.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const username = msg.from.username || msg.from.first_name;
    
    console.log(`User ${username} triggered /start command`);
    
    // Check if any parameters were provided
    if (!match[1] || match[1].trim() === '') {
        const errorMsg = 'No users provided. Format: /start user1 user2';
        console.log(`Error: ${errorMsg}`);
        bot.sendMessage(chatId, errorMsg);
        return;
    }
    
    // Get the users from the command
    const users = match[1].trim().split(' ');
    
    // Check if the number of users is exactly 2
    if (users.length !== 2) {
        const errorMsg = 'Please provide exactly 2 users.\nFormat: /start user1 user2';
        console.log(`Error: ${errorMsg} (Received ${users.length} users)`);
        bot.sendMessage(chatId, errorMsg);
        return;
    }

    // Create message with user information
    const message = `Users provided:\n1. ${users[0]}\n2. ${users[1]}`;
    
    // Log and send the message
    console.log(`Sending message to ${username}: ${message}`);
    bot.sendMessage(chatId, message);
});

// Handle errors
bot.on('error', (error) => {
    console.error('Telegram Bot Error:', error);
});

// Add message logging for all bot messages
bot.on('message', (msg) => {
    const username = msg.from.username || msg.from.first_name;
    console.log(`Received message from ${username}: ${msg.text}`);
}); 