import Moralis from 'moralis';
import 'dotenv/config'

async function getWalletTokenBalance(walletAddress) {
  try {
    await Moralis.start({
      apiKey: process.env.MORALIS_API_KEY
    });
    const response = await Moralis.EvmApi.wallets.getWalletTokenBalancesPrice({
      "chain": "0xaa36a7",
      "address": walletAddress
    });
    console.log(response);
    return response.raw;
  } catch (e) {
    console.error(e);
  }
}

// Using an immediately invoked async function
//(async () => {
//  await getWalletTokenBalance("0x19f3b78038C070030e0Cf4953EDe53aF1f0CB00E");
//})();
//FIX:
// node moralis.js =
// [Function (anonymous)]

export const walletBalances = {
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


