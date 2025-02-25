# OTC Agent

<div align="center">
<img src="./assets/banner.jpg"  alt="Bot Demo Screenshot" width="500" />
</div>

A Telegram bot built to facilitate peer-to-peer (P2P) token swaps between two users. The bot allows users to place orders, deposit assets, and execute swaps securely on the Avalanche Fuji testnet.

## Features

- **P2P Token Swaps**: Users can swap tokens like USDC and EURC with each other.
- **Order Management**: Users place orders using the `/myorder` command, specifying their wallet address, token amounts, and desired tokens.
- **Asset Tracking**: The bot monitors the blockchain for incoming transactions and confirms when assets are received.
- **Swap Execution**: Once both users' assets are received, the bot executes the swap and sends the tokens to the respective wallets.
- **Transparency**: Users can check the status of their swap using the `/info` command.

## Prerequisites

Before running the bot, ensure you have the following:

1. **Node.js**: Install Node.js (v16 or higher).
2. **Telegram Bot Token**: Obtain a bot token from [BotFather](https://core.telegram.org/bots#botfather).
3. **Avalanche Fuji Testnet RPC**: Use an RPC endpoint for the Avalanche Fuji testnet (e.g., from [Infura](https://infura.io/) or [Ankr](https://www.ankr.com/)).
4. **Private Key**: A private key for the bot's wallet on the Avalanche Fuji testnet.
5. **Test Tokens**: Ensure you have test tokens (USDC and EURC) on the Avalanche Fuji testnet for testing.

## Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/4rjunc/OTC-Agent.git
   cd telegram-p2p-swap-bot
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Set Up Environment Variables**:
   Create a `.env` file in the root directory and add the following variables:
   ```plaintext
    TELEGRAM_BOT_TOKEN=your-telegram-bot-token
    BOT_PRIVATE_KEY=your-bot-wallet-private-key
    RPC=rpc-url
    OPENAI_API_KEY=open-api-key
    MORALIS_API_KEY=moralis-api-key
   ```

4. **Run the Bot**:
   ```bash
   npm start
   ```

## Usage

### Commands

- **/start**: Start the bot and view available commands.
- **/myorder [wallet_address] [sending_amount] [sending_token] [requested_amount] [requested_token]**: Place a swap order.
  Example:
  ```
  /myorder 0xYourWalletAddress 1 USDC 1 EURC
  ```
- **/info**: Check the status of your swap.
- **/swapit**: Execute the swap once both assets are received.

### Example Workflow

1. **User 1** places an order:
   ```
   /myorder 0xUser1WalletAddress 1 USDC 1 EURC
   ```

2. **User 2** places an order:
   ```
   /myorder 0xUser2WalletAddress 1 EURC 1 USDC
   ```

3. Both users deposit their assets to the bot's wallet.

4. The bot confirms receipt of assets and notifies users.

5. Users execute the swap using `/swapit`.

6. The bot sends the swapped tokens to the respective wallets.

## Code Structure

- **`index.js`**: Main bot logic, including command handlers and transaction monitoring.
- **`.env`**: Environment variables for configuration.
- **`package.json`**: Project dependencies and scripts.


## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


