-- ============================================================
-- V3__rename_features_column.sql
-- Renommage features → features_json dans subscription_plans
-- Suite au refactoring SubscriptionPlan (suppression hypersistence)
-- ============================================================

ALTER TABLE subscription_plans
    RENAME COLUMN features TO features_json;

-- Mettre à jour le type : jsonb → text (stockage Jackson natif)
ALTER TABLE subscription_plans
    ALTER COLUMN features_json TYPE TEXT USING features_json::TEXT;