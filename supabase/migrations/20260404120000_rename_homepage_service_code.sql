-- P2-A: Rename 'homepage' service code to 'hospital_homepage' to avoid naming collision
-- with the brand portal View type

UPDATE service_catalog
SET code = 'hospital_homepage'
WHERE code = 'homepage';

UPDATE hospital_service_subscriptions
SET service_code = 'hospital_homepage'
WHERE service_code = 'homepage';
