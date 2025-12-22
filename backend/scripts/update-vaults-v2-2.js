/**
 * Update Vaults for v2.2 - New APY Structure
 *
 * Changes:
 * - All payouts are now MONTHLY
 * - Updated APY values
 * - Renamed miningPower → takaraAPY
 * - maxAPY is now "Max APY with boost"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateVaults() {
  console.log('🚀 Updating Vaults for v2.2');
  console.log('===========================================\n');

  try {
    // New vault configurations based on requirements
    const vaultUpdates = [
      // PRO VAULTS
      {
        name: 'Pro Vault 12M',
        tier: 'PRO',
        duration: 12,
        baseAPY: 12.0,
        maxAPY: 24.0,  // with boost
        takaraAPY: 50.0, // up to 50%
        payoutSchedule: 'MONTHLY'
      },
      {
        name: 'Pro Vault 30M',
        tier: 'PRO',
        duration: 30,
        baseAPY: 20.5,
        maxAPY: 41.0,  // with boost
        takaraAPY: 100.0, // up to 100%
        payoutSchedule: 'MONTHLY'
      },
      {
        name: 'Pro Vault 36M',
        tier: 'PRO',
        duration: 36,
        baseAPY: 25.0,
        maxAPY: 50.0,  // with boost
        takaraAPY: 150.0, // up to 150%
        payoutSchedule: 'MONTHLY'
      },

      // ELITE VAULTS
      {
        name: 'Elite Vault 12M',
        tier: 'ELITE',
        duration: 12,
        baseAPY: 15.0,
        maxAPY: 30.0,  // with boost
        takaraAPY: 150.0, // up to 150%
        payoutSchedule: 'MONTHLY'
      },
      {
        name: 'Elite Vault 30M',
        tier: 'ELITE',
        duration: 30,
        baseAPY: 17.0,
        maxAPY: 34.0,  // with boost
        takaraAPY: 250.0, // up to 250%
        payoutSchedule: 'MONTHLY'
      },
      {
        name: 'Elite Vault 36M',
        tier: 'ELITE',
        duration: 36,
        baseAPY: 19.0,
        maxAPY: 38.0,  // with boost
        takaraAPY: 350.0, // up to 350%
        payoutSchedule: 'MONTHLY'
      }
    ];

    console.log('📋 Vault Updates:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const config of vaultUpdates) {
      console.log(`\n🏦 ${config.name}`);
      console.log(`   Tier: ${config.tier} | Duration: ${config.duration} months`);
      console.log(`   Base APY: ${config.baseAPY}%`);
      console.log(`   Max APY with boost: ${config.maxAPY}%`);
      console.log(`   Takara APY: up to ${config.takaraAPY}%`);
      console.log(`   Payout: ${config.payoutSchedule}`);

      try {
        // Try to update existing vault
        const existingVault = await prisma.vault.findUnique({
          where: { name: config.name }
        });

        if (existingVault) {
          await prisma.vault.update({
            where: { name: config.name },
            data: {
              baseAPY: config.baseAPY,
              maxAPY: config.maxAPY,
              takaraAPY: config.takaraAPY,
              payoutSchedule: config.payoutSchedule
            }
          });
          console.log(`   ✅ Updated`);
        } else {
          // Create new vault if doesn't exist
          await prisma.vault.create({
            data: {
              name: config.name,
              tier: config.tier,
              duration: config.duration,
              baseAPY: config.baseAPY,
              maxAPY: config.maxAPY,
              takaraAPY: config.takaraAPY,
              payoutSchedule: config.payoutSchedule,
              minInvestment: config.tier === 'PRO' ? 100 : 1000,
              maxInvestment: config.tier === 'PRO' ? 10000 : 100000,
              requireTAKARA: false,
              isActive: true
            }
          });
          console.log(`   ✅ Created`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Vault updates completed!\n');

    // Display all vaults
    const allVaults = await prisma.vault.findMany({
      orderBy: [
        { tier: 'asc' },
        { duration: 'asc' }
      ]
    });

    console.log('📊 All Vaults:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const vault of allVaults) {
      console.log(`\n${vault.name} (${vault.isActive ? '✅ Active' : '❌ Inactive'})`);
      console.log(`  Base APY: ${vault.baseAPY}% | Max APY: ${vault.maxAPY}%`);
      console.log(`  Takara APY: up to ${vault.takaraAPY}%`);
      console.log(`  Duration: ${vault.duration}m | Payout: ${vault.payoutSchedule}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Script completed successfully!');

  } catch (error) {
    console.error('\n❌ Error updating vaults:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  updateVaults()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { updateVaults };
