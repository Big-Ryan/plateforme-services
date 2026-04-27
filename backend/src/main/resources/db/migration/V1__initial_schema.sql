-- V1__initial_schema.sql
-- Schéma initial de la plateforme de services

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('CLIENT', 'PROVIDER', 'ADMIN')),
    first_name    VARCHAR(100),
    last_name     VARCHAR(100),
    phone         VARCHAR(20),
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) UNIQUE NOT NULL,
    device_info VARCHAR(255),
    ip_address  VARCHAR(45),
    expires_at  TIMESTAMP   NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
    revoked_at  TIMESTAMP,
    created_at  TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_user       ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_expires    ON refresh_tokens(expires_at) WHERE revoked = FALSE;

-- EMAIL VERIFICATION TOKENS
CREATE TABLE email_verification_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP   NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_evtoken_user  ON email_verification_tokens(user_id);
CREATE INDEX idx_evtoken_token ON email_verification_tokens(token);

-- PASSWORD RESET TOKENS
CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP   NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE INDEX idx_prt_token ON password_reset_tokens(token_hash);

-- PROVIDER PROFILES
CREATE TABLE provider_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    description  TEXT,
    logo_url     VARCHAR(500),
    website      VARCHAR(255),
    address      VARCHAR(500),
    city         VARCHAR(100),
    country      VARCHAR(100) DEFAULT 'CM',
    verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    verified_at  TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_city     ON provider_profiles(city);
CREATE INDEX idx_provider_verified ON provider_profiles(verified);

-- CLIENT PROFILES
CREATE TABLE client_profiles (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255),
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT now()
);

-- CATEGORIES
CREATE TABLE categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) UNIQUE NOT NULL,
    slug       VARCHAR(100) UNIQUE NOT NULL,
    icon_url   VARCHAR(255),
    parent_id  UUID REFERENCES categories(id),
    sort_order INTEGER      NOT NULL DEFAULT 0,
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_parent ON categories(parent_id);
CREATE INDEX idx_category_slug   ON categories(slug);

-- SUBSCRIPTION PLANS
CREATE TABLE subscription_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100)   NOT NULL,
    billing_period  VARCHAR(20)    NOT NULL CHECK (billing_period IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    price           NUMERIC(10, 2) NOT NULL,
    currency        VARCHAR(3)     NOT NULL DEFAULT 'XAF',
    trial_days      INTEGER        NOT NULL DEFAULT 0,
    paypal_plan_id  VARCHAR(255),
    max_services    INTEGER        NOT NULL DEFAULT 10,
    is_active       BOOLEAN        NOT NULL DEFAULT TRUE,
    features        JSONB,
    created_at      TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP      NOT NULL DEFAULT now()
);

-- PROVIDER SUBSCRIPTIONS
CREATE TABLE provider_subscriptions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id            UUID         NOT NULL REFERENCES users(id),
    plan_id                UUID         NOT NULL REFERENCES subscription_plans(id),
    paypal_subscription_id VARCHAR(255),
    status                 VARCHAR(20)  NOT NULL CHECK (status IN
                               ('PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED')),
    start_date             DATE         NOT NULL,
    end_date               DATE,
    trial_end_date         DATE,
    cancelled_at           TIMESTAMP,
    cancellation_reason    TEXT,
    created_at             TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at             TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_provider_status ON provider_subscriptions(provider_id, status);
CREATE INDEX idx_sub_paypal_id       ON provider_subscriptions(paypal_subscription_id);
CREATE INDEX idx_sub_end_date        ON provider_subscriptions(end_date) WHERE status IN ('ACTIVE', 'TRIAL');

-- PAYMENTS
CREATE TABLE payments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id  UUID           NOT NULL REFERENCES provider_subscriptions(id),
    paypal_order_id  VARCHAR(255),
    paypal_capture_id VARCHAR(255),
    amount           NUMERIC(10, 2) NOT NULL,
    currency         VARCHAR(3)     NOT NULL DEFAULT 'USD',
    status           VARCHAR(20)    NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    invoice_url      VARCHAR(500),
    invoice_number   VARCHAR(50) UNIQUE,
    paid_at          TIMESTAMP,
    created_at       TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_status       ON payments(status);

-- SERVICES (offres prestataires)
CREATE TABLE services (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id   UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id   UUID REFERENCES categories(id),
    title         VARCHAR(255)   NOT NULL,
    description   TEXT,
    price_from    NUMERIC(10, 2),
    price_to      NUMERIC(10, 2),
    currency      VARCHAR(3)     NOT NULL DEFAULT 'XAF',
    delivery_time VARCHAR(100),
    location      VARCHAR(255),
    status        VARCHAR(20)    NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT', 'PUBLISHED', 'HIDDEN', 'SUSPENDED')),
    tags          TEXT[],
    images        TEXT[],
    view_count    INTEGER        NOT NULL DEFAULT 0,
    search_vector TSVECTOR,
    created_at    TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_services_provider   ON services(provider_id);
CREATE INDEX idx_services_status     ON services(status);
CREATE INDEX idx_services_category   ON services(category_id);
CREATE INDEX idx_services_location   ON services(location);
CREATE INDEX idx_services_fts        ON services USING GIN(search_vector);

-- Trigger pour maintenir search_vector à jour
CREATE OR REPLACE FUNCTION services_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('french', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('french', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('french', coalesce(NEW.location, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_services_fts
    BEFORE INSERT OR UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION services_search_vector_update();

-- NEGOTIATIONS
CREATE TABLE negotiations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id    UUID REFERENCES services(id),
    provider_id   UUID         NOT NULL REFERENCES users(id),
    client_id     UUID REFERENCES users(id),
    client_name   VARCHAR(255),
    client_phone  VARCHAR(20),
    client_email  VARCHAR(255),
    status        VARCHAR(20)    NOT NULL DEFAULT 'INITIATED'
                      CHECK (status IN ('INITIATED', 'IN_PROGRESS', 'AGREED', 'CLOSED', 'REJECTED', 'EXTERNAL')),
    mode          VARCHAR(20)    NOT NULL DEFAULT 'INTERNAL'
                      CHECK (mode IN ('INTERNAL', 'EXTERNAL')),
    notes         TEXT,
    agreed_price  NUMERIC(10, 2),
    created_at    TIMESTAMP      NOT NULL DEFAULT now(),
    updated_at    TIMESTAMP      NOT NULL DEFAULT now()
);

CREATE INDEX idx_nego_provider ON negotiations(provider_id);
CREATE INDEX idx_nego_client   ON negotiations(client_id);
CREATE INDEX idx_nego_status   ON negotiations(status);

-- NEGOTIATION MESSAGES
CREATE TABLE negotiation_messages (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    negotiation_id UUID         NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
    sender_id      UUID         NOT NULL REFERENCES users(id),
    content        TEXT         NOT NULL,
    is_read        BOOLEAN      NOT NULL DEFAULT FALSE,
    sent_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_negomsg_negotiation ON negotiation_messages(negotiation_id);
CREATE INDEX idx_negomsg_unread      ON negotiation_messages(negotiation_id, is_read) WHERE is_read = FALSE;

-- REVIEWS
CREATE TABLE reviews (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID         NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    client_id  UUID         NOT NULL REFERENCES users(id),
    rating     INTEGER      NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    is_visible BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    UNIQUE (service_id, client_id)
);

CREATE INDEX idx_reviews_service ON reviews(service_id, is_visible);

-- FAVORITES
CREATE TABLE favorites (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id  UUID      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID      NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (client_id, service_id)
);

CREATE INDEX idx_favorites_client ON favorites(client_id);

-- NOTIFICATIONS
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50)  NOT NULL,
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
    metadata   JSONB,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC);

-- AUDIT LOG
CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id   UUID,
    details     JSONB,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_user      ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_entity    ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action    ON audit_logs(action, created_at DESC);

-- FUNCTION : updated_at auto-update
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_users_updated_at              BEFORE UPDATE ON users              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_provider_profiles_updated_at  BEFORE UPDATE ON provider_profiles  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_client_profiles_updated_at    BEFORE UPDATE ON client_profiles    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_sub_plans_updated_at          BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_provider_subs_updated_at      BEFORE UPDATE ON provider_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_services_updated_at           BEFORE UPDATE ON services           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tg_negotiations_updated_at       BEFORE UPDATE ON negotiations       FOR EACH ROW EXECUTE FUNCTION set_updated_at();