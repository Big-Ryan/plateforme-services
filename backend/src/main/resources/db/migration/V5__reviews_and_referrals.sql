-- ===== Avis / Notation =====
CREATE TABLE IF NOT EXISTS reviews (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID        NOT NULL UNIQUE REFERENCES negotiations(id) ON DELETE CASCADE,
    service_id     UUID        NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    client_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ===== Parrainage =====
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code  VARCHAR(12) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES users(id);

UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL;

CREATE TABLE IF NOT EXISTS referral_rewards (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID      NOT NULL REFERENCES users(id),
    referred_id UUID      NOT NULL UNIQUE REFERENCES users(id),
    status      VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING','VALIDATED','CANCELLED')),
    validated_at TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);