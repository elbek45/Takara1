/**
 * NFT Service
 *
 * Handles NFT minting and metadata management using Metaplex
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Metaplex, keypairIdentity, toMetaplexFile } from '@metaplex-foundation/js';
import { NFTStorage, File as NFTFile, Blob } from 'nft.storage';
import { connection } from './solana.service';
import { getLogger } from '../config/logger';

const logger = getLogger('nft-service');

// Initialize NFT.Storage client (if API key is available)
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_API_KEY;
const nftStorageClient = NFT_STORAGE_KEY ? new NFTStorage({ token: NFT_STORAGE_KEY }) : null;

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    category: string;
    creators: Array<{
      address: string;
      share: number;
    }>;
  };
}

export interface MintNFTInput {
  investmentId: string;
  vaultName: string;
  vaultTier: string;
  usdtAmount: number;
  finalAPY: number;
  duration: number;
  takaraAPY: number;
  hasLaikaBoost: boolean;
  ownerWallet: string;
}

/**
 * Generate NFT metadata for investment
 */
export function generateNFTMetadata(input: MintNFTInput): NFTMetadata {
  const {
    investmentId,
    vaultName,
    vaultTier,
    usdtAmount,
    finalAPY,
    duration,
    takaraAPY,
    hasLaikaBoost,
    ownerWallet
  } = input;

  // Generate unique NFT name
  const nftName = `WEXEL ${vaultTier} #${investmentId.slice(0, 8)}`;

  // Create attributes
  const attributes = [
    { trait_type: 'Vault', value: vaultName },
    { trait_type: 'Tier', value: vaultTier },
    { trait_type: 'Investment Amount', value: `${usdtAmount} USDT` },
    { trait_type: 'APY', value: `${finalAPY}%` },
    { trait_type: 'Duration', value: `${duration} months` },
    { trait_type: 'Mining Power', value: `${takaraAPY}%` },
    { trait_type: 'LAIKA Boost', value: hasLaikaBoost ? 'Yes' : 'No' }
  ];

  // Generate description
  const description = `WEXEL Investment NFT representing a ${vaultName} position with ${finalAPY}% APY and ${takaraAPY}% TAKARA mining power. This NFT represents ownership of the investment and can be traded on the Takara Gold marketplace.`;

  // TODO: Replace with actual IPFS image URL
  const imageUrl = `https://placeholder.takaragold.io/nft/${vaultTier.toLowerCase()}.png`;

  return {
    name: nftName,
    symbol: 'WXL',
    description,
    image: imageUrl,
    attributes,
    properties: {
      category: 'image',
      creators: [
        {
          address: process.env.PLATFORM_WALLET_ADDRESS || '',
          share: 100
        }
      ]
    }
  };
}

/**
 * Upload metadata to IPFS using NFT.Storage
 */
export async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  try {
    logger.debug({ metadata }, 'Uploading NFT metadata to IPFS');

    if (nftStorageClient) {
      // Use NFT.Storage for real IPFS upload
      const metadataBlob = new Blob([JSON.stringify(metadata)]);
      const cid = await nftStorageClient.storeBlob(metadataBlob);
      const metadataUri = `https://nftstorage.link/ipfs/${cid}`;

      logger.info({ metadataUri, cid }, 'Metadata uploaded to IPFS');
      return metadataUri;
    } else {
      // Fallback to placeholder if no API key
      logger.warn('NFT_STORAGE_API_KEY not configured, using placeholder metadata URI');
      const metadataUri = `https://metadata.takaragold.io/${Date.now()}.json`;

      logger.info({ metadataUri }, 'Metadata uploaded (placeholder)');
      return metadataUri;
    }
  } catch (error) {
    logger.error({ error }, 'Failed to upload metadata');
    throw new Error('Failed to upload NFT metadata');
  }
}

/**
 * Mint NFT for investment using Metaplex
 */
export async function mintInvestmentNFT(
  input: MintNFTInput,
  platformWallet: Keypair
): Promise<{
  mintAddress: string;
  metadataUri: string;
  signature: string;
}> {
  try {
    logger.info({ investmentId: input.investmentId }, 'Minting investment NFT');

    // Generate metadata
    const metadata = generateNFTMetadata(input);

    // Upload metadata to IPFS
    const metadataUri = await uploadMetadata(metadata);

    // Check if we're in development/test mode
    const isDevMode = process.env.NODE_ENV !== 'production' || process.env.SOLANA_NETWORK === 'devnet';

    if (isDevMode && !process.env.ENABLE_REAL_NFT_MINTING) {
      // Use placeholder minting in development (unless explicitly enabled)
      logger.warn('Using placeholder NFT minting (set ENABLE_REAL_NFT_MINTING=true for real minting)');

      const mockMintAddress = Keypair.generate().publicKey.toBase58();
      const mockSignature = 'mock_signature_' + Date.now();

      logger.info({
        investmentId: input.investmentId,
        mintAddress: mockMintAddress
      }, 'NFT minted (placeholder)');

      return {
        mintAddress: mockMintAddress,
        metadataUri,
        signature: mockSignature
      };
    }

    // Real Metaplex NFT minting
    logger.info('Initializing Metaplex for real NFT minting');

    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(platformWallet));

    // Get WEXEL collection address
    const wexelCollectionAddress = process.env.WEXEL_COLLECTION_ADDRESS;

    // Build NFT creation options
    const createOptions: any = {
      uri: metadataUri,
      name: metadata.name,
      symbol: metadata.symbol,
      sellerFeeBasisPoints: 250, // 2.5% platform fee
      tokenOwner: new PublicKey(input.ownerWallet),
      creators: [
        {
          address: platformWallet.publicKey,
          share: 100
        }
      ]
    };

    // Add collection if configured
    if (wexelCollectionAddress && wexelCollectionAddress !== 'TO_BE_DEPLOYED') {
      createOptions.collection = new PublicKey(wexelCollectionAddress);
      logger.info({ collectionAddress: wexelCollectionAddress }, 'Minting NFT as part of WEXEL collection');
    } else {
      logger.warn('WEXEL_COLLECTION_ADDRESS not configured, minting without collection');
    }

    const { nft, response } = await metaplex.nfts().create(createOptions);

    const signature = response?.signature || 'unknown';

    logger.info({
      investmentId: input.investmentId,
      mintAddress: nft.address.toBase58(),
      signature
    }, 'NFT minted successfully on Solana');

    return {
      mintAddress: nft.address.toBase58(),
      metadataUri,
      signature
    };
  } catch (error: any) {
    logger.error({ error, investmentId: input.investmentId }, 'Failed to mint NFT');
    throw new Error(`Failed to mint investment NFT: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Transfer NFT ownership
 *
 * TODO: Implement actual SPL token transfer
 */
export async function transferNFT(
  mintAddress: string,
  fromWallet: string,
  toWallet: string,
  platformWallet: Keypair
): Promise<string> {
  try {
    logger.info({
      mintAddress,
      from: fromWallet,
      to: toWallet
    }, 'Transferring NFT');

    // TODO: Implement actual NFT transfer
    // Using @solana/spl-token

    /*
    const mint = new PublicKey(mintAddress);
    const fromPubkey = new PublicKey(fromWallet);
    const toPubkey = new PublicKey(toWallet);

    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(mint, fromPubkey);
    const toTokenAccount = await getAssociatedTokenAddress(mint, toPubkey);

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      1, // NFTs have amount of 1
      [],
      TOKEN_PROGRAM_ID
    );

    // ... send transaction
    */

    // Placeholder
    const mockSignature = 'nft_transfer_' + Date.now();

    logger.info({ signature: mockSignature }, 'NFT transferred (placeholder)');

    return mockSignature;
  } catch (error) {
    logger.error({ error, mintAddress }, 'Failed to transfer NFT');
    throw new Error('Failed to transfer NFT');
  }
}

/**
 * Verify NFT ownership
 */
export async function verifyNFTOwnership(
  mintAddress: string,
  ownerWallet: string
): Promise<boolean> {
  try {
    // TODO: Implement actual ownership verification
    // Query token account balance for the mint

    /*
    const mint = new PublicKey(mintAddress);
    const owner = new PublicKey(ownerWallet);
    const tokenAccount = await getAssociatedTokenAddress(mint, owner);

    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.amount === '1';
    */

    // Placeholder
    logger.debug({ mintAddress, ownerWallet }, 'Verifying NFT ownership (placeholder)');
    return true;
  } catch (error) {
    logger.error({ error, mintAddress }, 'Failed to verify NFT ownership');
    return false;
  }
}

/**
 * Get NFT metadata from chain using Metaplex
 */
export async function getNFTMetadata(mintAddress: string): Promise<NFTMetadata | null> {
  try {
    logger.debug({ mintAddress }, 'Fetching NFT metadata from chain');

    const metaplex = Metaplex.make(connection);
    const nft = await metaplex.nfts().findByMint({
      mintAddress: new PublicKey(mintAddress)
    });

    // Fetch JSON metadata from URI
    if (nft.uri) {
      const response = await fetch(nft.uri);
      const metadata = await response.json();

      logger.info({ mintAddress, metadataUri: nft.uri }, 'NFT metadata fetched successfully');
      return metadata as NFTMetadata;
    }

    logger.warn({ mintAddress }, 'NFT has no metadata URI');
    return null;
  } catch (error) {
    logger.error({ error, mintAddress }, 'Failed to get NFT metadata');
    return null;
  }
}

export default {
  generateNFTMetadata,
  uploadMetadata,
  mintInvestmentNFT,
  transferNFT,
  verifyNFTOwnership,
  getNFTMetadata
};
