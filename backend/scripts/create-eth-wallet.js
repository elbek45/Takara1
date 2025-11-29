/**
 * Create Ethereum Testnet Wallet
 * Generates a new Ethereum wallet for testnet usage
 */

const { Web3 } = require('web3');

const web3 = new Web3();

// Create new account
const account = web3.eth.accounts.create();

console.log('='.repeat(60));
console.log('Ethereum Testnet Wallet Created Successfully!');
console.log('='.repeat(60));
console.log('');
console.log('Address:     ', account.address);
console.log('Private Key: ', account.privateKey);
console.log('');
console.log('='.repeat(60));
console.log('IMPORTANT:');
console.log('1. Save this private key securely!');
console.log('2. Get testnet ETH from: https://sepoliafaucet.com/');
console.log('3. Add to .env.testnet:');
console.log('   PLATFORM_ETHEREUM_ADDRESS=' + account.address);
console.log('   PLATFORM_ETHEREUM_PRIVATE_KEY=' + account.privateKey);
console.log('='.repeat(60));
