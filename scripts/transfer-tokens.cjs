const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { getOrCreateAssociatedTokenAccount, transfer } = require('@solana/spl-token');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');

async function main() {
  const mnemonic = 'symptom cancel timber describe rubber admit audit upon problem transfer until obey';
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const derivedSeed = derivePath("m/44'/501'/0'", seed.toString('hex')).key;
  const fromKeypair = Keypair.fromSeed(derivedSeed);

  console.log('From wallet:', fromKeypair.publicKey.toBase58());

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  
  const toWallet = new PublicKey('7rXW8Sjiz4u7dd1afhid1K7oQiSXghtEpop9zxLSjbha');
  const TAKARA_MINT = new PublicKey('6biyv9NcaHmf8rKfLFGmj6eTwR9LBQtmi8dGUp2vRsgA');
  const LAIKA_MINT = new PublicKey('8o5XXBWEGmKJ7hn6hPaEzYNfuMxCWhwBQu5NSZSReKPd');

  const amount = 1000 * 1e6; // 1000 tokens with 6 decimals

  // Transfer TAKARA
  console.log('\n📤 Transferring 1000 TAKARA...');
  const fromTakaraAccount = await getOrCreateAssociatedTokenAccount(
    connection, fromKeypair, TAKARA_MINT, fromKeypair.publicKey
  );
  const toTakaraAccount = await getOrCreateAssociatedTokenAccount(
    connection, fromKeypair, TAKARA_MINT, toWallet
  );
  const takaraTx = await transfer(
    connection, fromKeypair, fromTakaraAccount.address, toTakaraAccount.address, fromKeypair, amount
  );
  console.log('✅ TAKARA sent:', takaraTx);

  // Transfer LAIKA
  console.log('\n📤 Transferring 1000 LAIKA...');
  const fromLaikaAccount = await getOrCreateAssociatedTokenAccount(
    connection, fromKeypair, LAIKA_MINT, fromKeypair.publicKey
  );
  const toLaikaAccount = await getOrCreateAssociatedTokenAccount(
    connection, fromKeypair, LAIKA_MINT, toWallet
  );
  const laikaTx = await transfer(
    connection, fromKeypair, fromLaikaAccount.address, toLaikaAccount.address, fromKeypair, amount
  );
  console.log('✅ LAIKA sent:', laikaTx);

  console.log('\n🎉 Done! Tokens sent to', toWallet.toBase58());
}

main().catch(console.error);
