-- ===== Mise à jour des plans d'abonnement =====
-- Prix en USD pour PayPal (XAF non supporté)
-- TRIAL sur 7 jours (WEEK) au lieu de MONTH

UPDATE subscription_plans SET
    price         = 30.00,
    currency      = 'USD',
    trial_days    = 7,
    billing_period = 'MONTHLY',
    features_json = '{"highlights": ["5 services publiés", "Profil prestataire", "Messagerie interne", "7 jours d''essai gratuit"]}'
WHERE name = 'Mensuel';

UPDATE subscription_plans SET
    price         = 75.00,
    currency      = 'USD',
    trial_days    = 7,
    billing_period = 'QUARTERLY',
    features_json = '{"highlights": ["15 services publiés", "Badge vérifié", "Priorité dans les résultats", "7 jours d''essai gratuit", "Économisez 17%"]}'
WHERE name = 'Trimestriel';

UPDATE subscription_plans SET
    price         = 270.00,
    currency      = 'USD',
    trial_days    = 7,
    billing_period = 'ANNUAL',
    features_json = '{"highlights": ["50 services publiés", "Badge vérifié prioritaire", "Statistiques avancées", "Support dédié", "7 jours d''essai gratuit", "Économisez 25%"]}'
WHERE name = 'Annuel';