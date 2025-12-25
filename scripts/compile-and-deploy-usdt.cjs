const solc = require('solc');
const TronWeb = require('tronweb').default || require('tronweb');
const bip39 = require('bip39');
const hdkey = require('hdkey');

const CONTRACT_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestUSDT {
    string public name = "Test USDT";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10 ** uint256(decimals);
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address _to, uint256 _value) public returns (bool) {
        require(balanceOf[msg.sender] >= _value, "Insufficient balance");
        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;
        emit Transfer(msg.sender, _to, _value);
        return true;
    }
    
    function approve(address _spender, uint256 _value) public returns (bool) {
        allowance[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }
    
    function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
        require(balanceOf[_from] >= _value, "Insufficient balance");
        require(allowance[_from][msg.sender] >= _value, "Allowance exceeded");
        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;
        allowance[_from][msg.sender] -= _value;
        emit Transfer(_from, _to, _value);
        return true;
    }
}
`;

async function main() {
  console.log('🔨 Compiling TestUSDT contract...');
  
  const input = {
    language: 'Solidity',
    sources: { 'TestUSDT.sol': { content: CONTRACT_SOURCE } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      optimizer: { enabled: true, runs: 200 }
    }
  };
  
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  
  if (output.errors) {
    output.errors.forEach(e => console.log(e.formattedMessage));
  }
  
  const contract = output.contracts['TestUSDT.sol'].TestUSDT;
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;
  
  console.log('✅ Compiled successfully');
  console.log('   Bytecode length:', bytecode.length);
  
  // Deploy to TRON
  console.log('\n🚀 Deploying to TRON Shasta...');
  
  const mnemonic = 'symptom cancel timber describe rubber admit audit upon problem transfer until obey';
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = hdkey.fromMasterSeed(seed);
  const addrNode = root.derive("m/44'/195'/0'/0/0");
  const privateKey = addrNode.privateKey.toString('hex');

  const TronWebClass = TronWeb.TronWeb || TronWeb;
  const tronWeb = new TronWebClass({
    fullHost: 'https://api.shasta.trongrid.io',
    privateKey: privateKey
  });

  const address = tronWeb.address.fromPrivateKey(privateKey);
  console.log('📍 Deployer:', address);

  const balance = await tronWeb.trx.getBalance(address);
  console.log('💰 Balance:', (balance / 1e6).toFixed(2), 'TRX');
  
  const initialSupply = 20000000;
  
  const tx = await tronWeb.transactionBuilder.createSmartContract({
    abi: abi,
    bytecode: bytecode,
    feeLimit: 1000000000,
    callValue: 0,
    parameters: [initialSupply]
  }, address);

  const signedTx = await tronWeb.trx.sign(tx);
  const result = await tronWeb.trx.sendRawTransaction(signedTx);

  console.log('📝 Transaction:', result.txid);
  console.log('\n⏳ Waiting for confirmation...');
  
  await new Promise(r => setTimeout(r, 6000));
  
  const txInfo = await tronWeb.trx.getTransactionInfo(result.txid);
  
  if (txInfo.receipt && txInfo.receipt.result === 'SUCCESS') {
    const contractAddress = tronWeb.address.fromHex(txInfo.contract_address);
    console.log('\n🎉 Test USDT Deployed!');
    console.log('━'.repeat(50));
    console.log('Contract:', contractAddress);
    console.log('Supply: 20,000,000 USDT');
    console.log('Network: TRON Shasta');
    console.log('━'.repeat(50));
  } else {
    console.log('❌ Deployment failed:', txInfo.receipt);
  }
}

main().catch(console.error);
