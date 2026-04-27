-- V2__seed_data.sql
-- Données de démarrage : catégories + plans d'abonnement

-- Catégories
INSERT INTO categories (name, slug, sort_order) VALUES
    ('Informatique & Tech',      'informatique-tech',       1),
    ('BTP & Construction',       'btp-construction',        2),
    ('Santé & Bien-être',        'sante-bien-etre',         3),
    ('Commerce & Distribution',  'commerce-distribution',   4),
    ('Transport & Logistique',   'transport-logistique',    5),
    ('Agriculture & Agro-alim',  'agriculture-agro',        6),
    ('Éducation & Formation',    'education-formation',     7),
    ('Juridique & Comptabilité', 'juridique-comptabilite',  8),
    ('Communication & Médias',   'communication-medias',    9),
    ('Artisanat & Services',     'artisanat-services',     10);

-- Plans d'abonnement
INSERT INTO subscription_plans (name, billing_period, price, currency, trial_days, max_services, is_active, features) VALUES
    (
        'Mensuel',
        'MONTHLY',
        15000.00,
        'XAF',
        7,
        5,
        TRUE,
        '{"highlights": ["5 services publiés", "Profil prestataire", "Messagerie interne", "7 jours d''essai gratuit"]}'
    ),
    (
        'Trimestriel',
        'QUARTERLY',
        39000.00,
        'XAF',
        14,
        15,
        TRUE,
        '{"highlights": ["15 services publiés", "Badge vérifié", "Priorité dans les résultats", "14 jours d''essai gratuit", "Économisez 13%"]}'
    ),
    (
        'Annuel',
        'ANNUAL',
        120000.00,
        'XAF',
        30,
        50,
        TRUE,
        '{"highlights": ["50 services publiés", "Badge vérifié prioritaire", "Statistiques avancées", "Support dédié", "30 jours d''essai gratuit", "Économisez 33%"]}'
    );

-- Compte admin par défaut (mot de passe à changer en prod)
-- Mot de passe: Admin@2024! (BCrypt, à override en prod via env ou premier boot)
INSERT INTO users (email, password, role, first_name, last_name, is_active, email_verified) VALUES
    (
        'admin@plateforme.cm',
        '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4oKJMJFMOy',
        'ADMIN',
        'Super',
        'Admin',
        TRUE,
        TRUE
    );