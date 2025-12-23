const { TronWeb } = require('tronweb');

// Tron Mainnet configuration
const FULL_NODE = 'https://api.trongrid.io';

// Private key - need a real Tron wallet with TRX and USDT
const PRIVATE_KEY = process.env.TRON_PRIVATE_KEY || '1cc99a2885dcb66a4aaeda8ede9c20fd34c619aa320b1d980c268ac279e03291';

const TO_ADDRESS = 'TBsDeoAHSmotei4pRvvx39gxQnDwnyP7qn';
const AMOUNT = 100; // 100 USDT

// USDT TRC20 contract on Tron Mainnet
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

async function main() {
  console.log('Connecting to Tron Mainnet...');
  
  const tronWeb = new TronWeb({
    fullHost: FULL_NODE,
    privateKey: PRIVATE_KEY
  });
  
  const walletAddress = tronWeb.address.fromPrivateKey(PRIVATE_KEY);
  console.log('Platform wallet:', walletAddress);
  
  // Check TRX balance for gas
  const trxBalance = await tronWeb.trx.getBalance(walletAddress);
  console.log('TRX Balance:', trxBalance / 1e6, 'TRX');
  
  if (trxBalance === 0) {
    console.log('\nERROR: No TRX for gas!');
    console.log('Send some TRX to:', walletAddress);
    return;
  }
  
  // Check USDT balance
  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const decimals = await contract.decimals().call();
    const symbol = await contract.symbol().call();
    const balance = await contract.balanceOf(walletAddress).call();
    
    const balanceFormatted = Number(balance) / Math.pow(10, decimals);
    console.log('Token:', symbol, '| Decimals:', decimals);
    console.log('USDT Balance:', balanceFormatted);
    
    if (balanceFormatted < AMOUNT) {
      console.log('\nERROR: Insufficient USDT balance!');
      console.log('Need:', AMOUNT, 'Have:', balanceFormatted);
      return;
    }
    
    const amountInUnits = AMOUNT * Math.pow(10, decimals);
    
    console.log('\nSending', AMOUNT, 'USDT to', TO_ADDRESS, '...');
    
    const tx = await contract.transfer(TO_ADDRESS, amountInUnits).send({
      feeLimit: 100000000,
      callValue: 0
    });
    
    console.log('TX Hash:', tx);
    console.log('\n✓ Success!');
    console.log('View on Tronscan: https://tronscan.org/#/transaction/' + tx);
    
  } catch (error) {
    console.error('Error:', error.message || error);
  }
}

main();
