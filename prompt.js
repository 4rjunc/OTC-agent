import { OpenAI } from "openai"
import 'dotenv/config'
//require('dotenv').config();

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this environment variable
  //apiKey: "sk-proj-dcAdg4V02Bd9X95xq4mzT3BlbkFJSuy2qrVhlenkwsAJgJix"
});

/**
 * Analyzes a transaction string using OpenAI and extracts structured data
 * @param {string} transactionString - The transaction string to analyze
 * @returns {Promise<Object>} The structured transaction data
 */
export async function analyzeTransaction(transactionString) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // You can use a different model if needed
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that analyzes cryptocurrency transaction strings. 
          Extract the wallet address, the token being sent, the amount being sent, 
          the token being requested, and the amount requested. Return ONLY a JSON object with no additional text.`
        },
        {
          role: "user",
          content: `Extract the following information from this transaction string and return it as JSON:
          - wallet: The Ethereum wallet address
          - sendingToken: The token currency being sent
          - sendingAmount: The amount being sent (as a number)
          - requestedToken: The token currency being requested
          - requestedAmount: The amount being requested (as a number)
          
          Transaction string: "${transactionString}"`
        }
      ],
      response_format: { type: "json_object" }
    });

    // Parse the JSON response
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("Error analyzing transaction:", error);
    throw error;
  }
}

/**
 * Checks if the required tokens in swapData have been deposited in the bot's wallet.
 * @param {Object} swapData - The swap request data.
 * @param {Object} walletBalances - The bot's ERC20 token balances.
 * @returns {boolean} - Returns true if both users have deposited their tokens, false otherwise.
 * TODO: Also crosscheck the wallets transaction history from both users wallet address to finalize both users transfered the tokens/NFT/Assets mentioned in the order 
 */
export async function analyzeWallet(swapData, walletBalances) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that checks wallet deposits for a token swap.
          Given a swap request and a wallet's ERC20 token balances, determine if both users have deposited the correct amount of tokens. 
          Return ONLY a JSON object containing a boolean field "validDeposit" indicating whether the deposits match or not.`
        },
        {
          role: "user",
          content: `Check if the users' deposits match the required swap amounts.

          Swap Data (JSON format): 
          ${JSON.stringify(swapData)}

          Wallet Balances (JSON format): 
          ${JSON.stringify(walletBalances)}

          Return a JSON response: 
          {
            "validDeposit": true // or false
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content).validDeposit;
  } catch (error) {
    console.error("Error analyzing wallet deposits:", error);
    return false;
  }
}

const SEPOLIA_USDC = "0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4";
const SEPOLIA_EURC = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";

export async function formatSwapTransactions(orderData) {
  try {
    // Create an empty result object
    const result = {};

    // Map token names to their addresses
    const tokenAddresses = {
      "EURC": SEPOLIA_EURC,
      "USDC": SEPOLIA_USDC
    };

    // Counter for transaction numbering
    let counter = 1;

    // Process each order in the orderData
    for (const userId in orderData) {
      if (Object.prototype.hasOwnProperty.call(orderData, userId)) {
        const order = orderData[userId];

        // Create a transaction entry
        result[counter.toString()] = {
          recipientWallet: order.wallet,
          sendingToken: tokenAddresses[order.requestedToken],
          sendingAmount: order.requestedAmount
        };

        counter++;
      }
    }

    return result;
  } catch (error) {
    console.error("Error formatting swap transactions:", error);
    return null;
  }
}
// Example usage
async function main() {
  const transactionString = "0x19f3b78038C070030e0Cf4953EDe53aF1f0CB00E I am sending 1 USDC for 1 EURC";

  try {
    console.log("analyzeTransaction")
    const result = await analyzeTransaction(transactionString);
    console.log(result);
    // Expected output:
    // {
    //   "wallet": "0x19f3b78038C070030e0Cf4953EDe53aF1f0CB00E",
    //   "sendingToken": "USDC",
    //   "sendingAmount": 1,
    //   "requestedToken": "EURC",
    //   "requestedAmount": 1
    // }
  } catch (error) {
    console.error("Failed to analyze transaction:", error);
  }

  const swapData = {
    rjunc: {
      wallet: '0x0C82d6C3f6bEdFE87E7f90f357308E25b574b85b',
      sendingToken: 'EURC',
      sendingAmount: 1,
      requestedToken: 'USDC',
      requestedAmount: 1
    },
    nobody: {
      wallet: '0x8fE6509E8E7954B4848772e989829a958805a2B4',
      sendingToken: 'USDC',
      sendingAmount: 1,
      requestedToken: 'EURC',
      requestedAmount: 1
    }
  }

  const walletBalances = {
    "cursor": null,
    "page": 0,
    "page_size": 100,
    "result": [
      {
        "token_address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "symbol": "ETH",
        "name": "Ether",
        "logo": "https://cdn.moralis.io/eth/0x.png",
        "thumbnail": "https://cdn.moralis.io/eth/0x_thumb.png",
        "decimals": 18,
        "balance": "2000000000000000000",
        "possible_spam": false,
        "verified_contract": true,
        "total_supply": null,
        "total_supply_formatted": null,
        "percentage_relative_to_total_supply": null,
        "security_score": null,
        "balance_formatted": "2",
        "usd_price": null,
        "usd_price_24hr_percent_change": null,
        "usd_price_24hr_usd_change": null,
        "usd_value": null,
        "usd_value_24hr_usd_change": null,
        "native_token": true,
        "portfolio_percentage": 0
      },
      {
        "token_address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        "symbol": "USDC",
        "name": "USDC",
        "logo": null,
        "thumbnail": null,
        "decimals": 6,
        "balance": "2000000",
        "possible_spam": false,
        "verified_contract": false,
        "total_supply": "384380154324832832",
        "total_supply_formatted": "384380154324.832832",
        "percentage_relative_to_total_supply": 5.20318226e-10,
        "security_score": null,
        "balance_formatted": "2",
        "usd_price": null,
        "usd_price_24hr_percent_change": null,
        "usd_price_24hr_usd_change": null,
        "usd_value": null,
        "usd_value_24hr_usd_change": null,
        "native_token": false,
        "portfolio_percentage": 0
      },
      {
        "token_address": "0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4",
        "symbol": "EURC",
        "name": "EURC",
        "logo": null,
        "thumbnail": null,
        "decimals": 6,
        "balance": "2000000",
        "possible_spam": false,
        "verified_contract": false,
        "total_supply": "545421698980000",
        "total_supply_formatted": "545421698.98",
        "percentage_relative_to_total_supply": 3.66688748126e-7,
        "security_score": null,
        "balance_formatted": "2",
        "usd_price": null,
        "usd_price_24hr_percent_change": null,
        "usd_price_24hr_usd_change": null,
        "usd_value": null,
        "usd_value_24hr_usd_change": null,
        "native_token": false,
        "portfolio_percentage": 0
      }
    ]
  }

  try {
    console.log("analyzeWallet")
    const result = await analyzeWallet(swapData, walletBalances);
    console.log(result);

  } catch (error) {
    console.log("analyzeWallet", error)
  }

  try {
    console.log("formatSwapTransactions")
    const result = await formatSwapTransactions(swapData);
    console.log(result);

  } catch (error) {
    console.log("analyzeWallet", error)
  }

}

// Run the example
//main();
