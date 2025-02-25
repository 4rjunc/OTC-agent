const { ethers } = require("ethers");
require('dotenv').config();

// Configuration
const RPC = process.env.RPC;
const provider = new ethers.providers.JsonRpcProvider(RPC);

const senderWallet = new ethers.Wallet(process.env.BOT_PRIVATE_KEY, provider);

const tokenContractAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"; // Replace with the token contract address
const recipientAddress = "0x19f3b78038C070030e0Cf4953EDe53aF1f0CB00E"; // Replace with the recipient's wallet address
const amount = ethers.utils.parseUnits("2", 6); // Replace with the amount to transfer (e.g., 10 tokens with 18 decimals)

// ERC-20 Token ABI (simplified)
const erc20Abi = [
  "function transfer(address to, uint256 amount) returns (bool)",
];

// Create a contract instance
const tokenContract = new ethers.Contract(tokenContractAddress, erc20Abi, senderWallet);

// Transfer tokens
async function transferTokens() {
  try {
    console.log("Sending transaction...");

    // Call the transfer function
    const tx = await tokenContract.transfer(recipientAddress, amount);

    console.log("Transaction hash:", tx.hash);

    // Wait for the transaction to be mined
    await tx.wait();
    console.log("Transaction confirmed!");
  } catch (error) {
    console.error("Error transferring tokens:", error);
  }
}

// Execute the transfer
transferTokens();
