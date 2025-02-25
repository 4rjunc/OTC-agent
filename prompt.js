const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Make sure to set this environment variable
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

// Example usage
async function main() {
  const transactionString = "0x19f3b78038C070030e0Cf4953EDe53aF1f0CB00E I am sending 1 USDC for 1 EURC";

  try {
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
}

// Run the example
main();
