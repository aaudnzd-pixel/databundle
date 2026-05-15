-- DataBundle Data Reset Script
-- WARNING: This will delete all transaction history and reset all agent balances.

-- 1. Delete all transaction history
TRUNCATE TABLE transactions CASCADE;

-- 2. Delete all withdrawal requests
TRUNCATE TABLE withdrawals CASCADE;

-- 3. Reset all user balances and commissions to zero
UPDATE profiles 
SET balance = 0, 
    commissions = 0;

-- 4. (Optional) Clear agent-specific markups if you want a total reset
-- TRUNCATE TABLE agent_markups CASCADE;

-- 5. Keep 'packages' and 'system_settings' as they are core configuration.
