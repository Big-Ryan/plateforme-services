-- Mise à jour des plans en USD pour PayPal
UPDATE subscription_plans SET
    price    = 30.00,
    currency = 'USD'
WHERE name = 'Mensuel';

UPDATE subscription_plans SET
    price    = 75.00,
    currency = 'USD'
WHERE name = 'Trimestriel';

UPDATE subscription_plans SET
    price    = 270.00,
    currency = 'USD'
WHERE name = 'Annuel';