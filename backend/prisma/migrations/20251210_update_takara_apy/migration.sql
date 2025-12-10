-- Update Takara APY values: 50% - 500%
-- Starter Vaults: 50%, 100%, 150%
-- Pro Vaults: 200%, 300%, 400%
-- Elite Vaults: 250%, 350%, 500%

-- Starter Vault 12M: 50%
UPDATE "vaults" SET "takaraAPY" = 50 WHERE "name" = 'Starter Vault 12M';

-- Starter Vault 30M: 100%
UPDATE "vaults" SET "takaraAPY" = 100 WHERE "name" = 'Starter Vault 30M';

-- Starter Vault 36M: 150%
UPDATE "vaults" SET "takaraAPY" = 150 WHERE "name" = 'Starter Vault 36M';

-- Pro Vault 12M: 200%
UPDATE "vaults" SET "takaraAPY" = 200 WHERE "name" = 'Pro Vault 12M';

-- Pro Vault 30M: 300%
UPDATE "vaults" SET "takaraAPY" = 300 WHERE "name" = 'Pro Vault 30M';

-- Pro Vault 36M: 400%
UPDATE "vaults" SET "takaraAPY" = 400 WHERE "name" = 'Pro Vault 36M';

-- Elite Vault 12M: 250%
UPDATE "vaults" SET "takaraAPY" = 250 WHERE "name" = 'Elite Vault 12M';

-- Elite Vault 30M: 350%
UPDATE "vaults" SET "takaraAPY" = 350 WHERE "name" = 'Elite Vault 30M';

-- Elite Vault 36M: 500% (MAXIMUM)
UPDATE "vaults" SET "takaraAPY" = 500 WHERE "name" = 'Elite Vault 36M';
