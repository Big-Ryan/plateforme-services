-- Mise à jour de la table reviews pour correspondre au modèle actuel
-- La V1 avait une structure incomplète, on la corrige ici

-- Supprimer l'ancienne contrainte unique si elle existe
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_service_id_client_id_key;

-- Supprimer l'ancien index si il existe
DROP INDEX IF EXISTS idx_reviews_service;

-- Ajouter les colonnes manquantes si elles n'existent pas
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS negotiation_id UUID REFERENCES negotiations(id) ON DELETE CASCADE;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS provider_id    UUID REFERENCES users(id) ON DELETE CASCADE;

-- Supprimer les colonnes de l'ancienne structure devenues inutiles
ALTER TABLE reviews DROP COLUMN IF EXISTS is_visible;

-- Ajouter la contrainte UNIQUE sur negotiation_id
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_negotiation_id_key;
ALTER TABLE reviews ADD CONSTRAINT reviews_negotiation_id_key UNIQUE (negotiation_id);

-- Recréer les index utiles
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_negotiation ON reviews(negotiation_id);