-- Initialize all databases for e-commerce microservices

-- Create databases
CREATE DATABASE product_db;
CREATE DATABASE auth_db;
CREATE DATABASE order_db;
CREATE DATABASE payment_db;
CREATE DATABASE email_db;
CREATE DATABASE inventory_db;
CREATE DATABASE media_db;
CREATE DATABASE content_db;
CREATE DATABASE analytics_db;
CREATE DATABASE keycloak;

-- Create users
CREATE USER productuser WITH PASSWORD 'productpass';
CREATE USER authuser WITH PASSWORD 'authpass';
CREATE USER orderuser WITH PASSWORD 'orderpass';
CREATE USER paymentuser WITH PASSWORD 'paymentpass';
CREATE USER emailuser WITH PASSWORD 'emailpass';
CREATE USER inventoryuser WITH PASSWORD 'inventorypass';
CREATE USER mediauser WITH PASSWORD 'mediapass';
CREATE USER contentuser WITH PASSWORD 'contentpass';
CREATE USER analyticsuser WITH PASSWORD 'analyticspass';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE product_db TO productuser;
GRANT ALL PRIVILEGES ON DATABASE auth_db TO authuser;
GRANT ALL PRIVILEGES ON DATABASE order_db TO orderuser;
GRANT ALL PRIVILEGES ON DATABASE payment_db TO paymentuser;
GRANT ALL PRIVILEGES ON DATABASE email_db TO emailuser;
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO inventoryuser;
GRANT ALL PRIVILEGES ON DATABASE media_db TO mediauser;
GRANT ALL PRIVILEGES ON DATABASE content_db TO contentuser;
GRANT ALL PRIVILEGES ON DATABASE analytics_db TO analyticsuser;
