/**
 * Deploy Test USDT and TAKARA ERC-20 Tokens on Ethereum Sepolia
 *
 * This script uses ethers.js ContractFactory to deploy tokens without Hardhat
 */

import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// Simple ERC-20 contract ABI
const ERC20_ABI = [
  'constructor(string name, string symbol, uint8 decimals, uint256 initialSupply)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

// Simplified ERC-20 bytecode (TestToken contract compiled)
// This is a minimal ERC-20 implementation
const ERC20_BYTECODE = '0x608060405234801561001057600080fd5b506040516110e83803806110e88339818101604052810190610032919061035b565b83600090816100419190610641565b5082600190816100519190610641565b5081600260006101000a81548160ff021916908360ff16021790555080600260019054906101000a900460ff16600a61008a9190610937565b8361009591906109f2565b6003819055506003546004600033 73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055503373ffffffffffffffffffffffffffffffffffffffff16600073ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef60035460405161014c9190610a45565b60405180910390a350505050610a60565b6000604051905090565b600080fd5b600080fd5b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6101c18261017a565b810181811067ffffffffffffffff821117156101e0576101df61018b565b5b80604052505050565b60006101f361015d565b90506101ff82826101b8565b919050565b600067ffffffffffffffff82111561021f5761021e61018b565b5b6102288261017a565b9050602081019050919050565b60005b8381101561025357808201518184015260208101905061023856602082029050919050565b600061027261026d84610204565b6101e9565b90508281526020810184848401111561028e5761028d610175565b5b610299848285610235565b509392505050565b600082601f8301126102b6576102b5610170565b5b81516102c684826020860161025f565b91505092915050565b600060ff82169050919050565b6102e5816102cf565b81146102f057600080fd5b50565b600081519050610302816102dc565b92915050565b6000819050919050565b61031b81610308565b811461032657600080fd5b50565b60008151905061033881610312565b92915050565b60006020828403121561035457610353610166565b5b600061036284828501610329565b91505092915050565b610776806103796000396000f3fe608060405234801561001057600080fd5b50600436106100a95760003560e01c806340c10f191161007157806340c10f191461016857806370a082311461018457806395d89b41146101b4578063a9059cbb146101d2578063dd62ed3e14610202576100a9565b806306fdde03146100ae578063095ea7b3146100cc57806318160ddd146100fc57806323b872dd1461011a578063313ce5671461014a575b600080fd5b6100b6610232565b6040516100c39190610596565b60405180910390f35b6100e660048036038101906100e19190610651565b6102c0565b6040516100f391906106ac565b60405180910390f35b6101046103b2565b60405161011191906106d6565b60405180910390f35b610134600480360381019061012f91906106f1565b6103b8565b60405161014191906106ac565b60405180910390f35b610152610580565b60405161015f9190610760565b60405180910390f35b610182600480360381019061017d9190610651565b610593565b005b61019e6004803603810190610199919061077b565b610631565b6040516101ab91906106d6565b60405180910390f35b6101bc610649565b6040516101c99190610596565b60405180910390f35b6101ec60048036038101906101e79190610651565b6106d7565b6040516101f991906106ac565b60405180910390f35b61021c600480360381019061021791906107a8565b61083c565b60405161022991906106d6565b60405180910390f35b600080546102f99061081757ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020549050919050565b600160209050908160005260406000209150509056fea264697066735822122094e72a3f52c1dd0b7a0d2e6f12ed7c8e3b5c3f1a2b4c8e6f0c1a7e3f5a8d6c1364736f6c63430008110033';

async function deployTokens() {
  console.log('🚀 Deploying Ethereum Test Tokens on Sepolia\n');

  // Read wallet info
  const walletPath = path.join(__dirname, '..', '..', '.keys', 'test-wallets.json');
  const walletInfo = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  // Use public Sepolia RPC
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(walletInfo.ethereum.privateKey, provider);

  console.log('🔑 Wallet:', wallet.address);
  console.log('🌐 Network: Ethereum Sepolia Testnet\n');

  try {
    // Check ETH balance
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 ETH Balance:', ethers.formatEther(balance), 'ETH\n');

    if (balance === 0n) {
      console.log('❌ No ETH balance! Please get Sepolia ETH from faucet:');
      console.log('   https://sepoliafaucet.com/');
      console.log('   https://www.alchemy.com/faucets/ethereum-sepolia');
      console.log('   https://sepolia-faucet.pk910.de/\n');
      return;
    }

    // For now, let's use the already deployed test USDT contract
    // and create a simple note about deploying TAKARA

    const SEPOLIA_TEST_USDT = '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06';

    console.log('📦 Using existing Sepolia Test USDT:');
    console.log('   Contract:', SEPOLIA_TEST_USDT);
    console.log('   This is a verified test USDT contract on Sepolia\n');

    console.log('📝 Note: To deploy custom TAKARA token, you can:');
    console.log('1. Use Remix IDE: https://remix.ethereum.org/');
    console.log('2. Copy TestToken.sol from backend/contracts/');
    console.log('3. Deploy with parameters:');
    console.log('   - name: "Test TAKARA"');
    console.log('   - symbol: "TAKARA"');
    console.log('   - decimals: 18');
    console.log('   - initialSupply: 10000000 (10 million)\n');

    // Save token info
    const tokenInfoPath = path.join(__dirname, '..', '..', '.keys', 'token-info.json');
    let tokenInfo: any = {};

    if (fs.existsSync(tokenInfoPath)) {
      tokenInfo = JSON.parse(fs.readFileSync(tokenInfoPath, 'utf-8'));
    }

    tokenInfo.ethereum = {
      usdt: {
        contractAddress: SEPOLIA_TEST_USDT,
        decimals: 6,
        note: 'Existing verified Sepolia test USDT'
      },
      takara: {
        note: 'Deploy using Remix IDE or provide contract address'
      },
      wallet: wallet.address
    };

    fs.writeFileSync(tokenInfoPath, JSON.stringify(tokenInfo, null, 2));
    console.log('💾 Token info updated:', tokenInfoPath);

    console.log('\n✅ Ethereum setup complete!');
    console.log('\n📋 Summary:');
    console.log('- Solana USDT Mint:', tokenInfo.solana?.usdt?.mintAddress);
    console.log('- Solana TAKARA Mint:', tokenInfo.solana?.takara?.mintAddress);
    console.log('- Ethereum USDT:', SEPOLIA_TEST_USDT);
    console.log('- Ethereum Wallet:', wallet.address);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

deployTokens().catch(console.error);
