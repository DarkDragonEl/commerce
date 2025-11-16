.PHONY: help dev dev-detached stop build test clean migrate seed deploy logs install-deps

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo '${GREEN}E-Commerce Microservices Platform${RESET}'
	@echo ''
	@echo 'Usage:'
	@echo '  ${YELLOW}make${RESET} ${GREEN}<target>${RESET}'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} { \
		if (/^[a-zA-Z_-]+:.*?##.*$$/) {printf "  ${YELLOW}%-20s${RESET} %s\n", $$1, $$2} \
		else if (/^## .*$$/) {printf "  ${GREEN}%s${RESET}\n", substr($$1,4)} \
		}' $(MAKEFILE_LIST)

## Development Commands

dev: ## Start development environment with docker-compose
	@echo "${GREEN}Starting development environment...${RESET}"
	docker-compose up --build

dev-detached: ## Start development environment in detached mode
	@echo "${GREEN}Starting development environment (detached)...${RESET}"
	docker-compose up -d --build

stop: ## Stop all running containers
	@echo "${YELLOW}Stopping containers...${RESET}"
	docker-compose down

restart: ## Restart all services
	@echo "${YELLOW}Restarting services...${RESET}"
	docker-compose restart

## Build Commands

build: ## Build all services
	@echo "${GREEN}Building all services...${RESET}"
	docker-compose build

build-service: ## Build specific service (make build-service service=product-service)
	@echo "${GREEN}Building $(service)...${RESET}"
	docker-compose build $(service)

## Database Commands

migrate: ## Run database migrations for all services
	@echo "${GREEN}Running migrations...${RESET}"
	@for service in product-service order-service auth-service content-service inventory-service analytics-service; do \
		echo "${YELLOW}Migrating $$service...${RESET}"; \
		cd services/$$service && npx prisma migrate dev && cd ../..; \
	done

migrate-deploy: ## Run production migrations
	@echo "${GREEN}Running production migrations...${RESET}"
	@for service in product-service order-service auth-service content-service inventory-service analytics-service; do \
		echo "${YELLOW}Migrating $$service...${RESET}"; \
		cd services/$$service && npx prisma migrate deploy && cd ../..; \
	done

seed: ## Seed databases with test data
	@echo "${GREEN}Seeding databases...${RESET}"
	@for service in product-service order-service content-service; do \
		echo "${YELLOW}Seeding $$service...${RESET}"; \
		cd services/$$service && npm run seed && cd ../..; \
	done

reset-db: ## Reset all databases (WARNING: destructive)
	@echo "${YELLOW}WARNING: This will delete all data. Press Ctrl+C to cancel.${RESET}"
	@sleep 5
	@for service in product-service order-service auth-service content-service inventory-service analytics-service; do \
		echo "${YELLOW}Resetting $$service database...${RESET}"; \
		cd services/$$service && npx prisma migrate reset --force && cd ../..; \
	done

## Testing Commands

test: ## Run all tests
	@echo "${GREEN}Running all tests...${RESET}"
	@for service in product-service order-service auth-service payment-service content-service media-service inventory-service; do \
		echo "${YELLOW}Testing $$service...${RESET}"; \
		cd services/$$service && npm test && cd ../..; \
	done

test-service: ## Run tests for specific service (make test-service service=product-service)
	@echo "${GREEN}Testing $(service)...${RESET}"
	cd services/$(service) && npm test

test-coverage: ## Run tests with coverage
	@echo "${GREEN}Running tests with coverage...${RESET}"
	@for service in product-service order-service auth-service payment-service content-service media-service inventory-service; do \
		echo "${YELLOW}Testing $$service with coverage...${RESET}"; \
		cd services/$$service && npm run test:coverage && cd ../..; \
	done

test-e2e: ## Run end-to-end tests
	@echo "${GREEN}Running E2E tests...${RESET}"
	cd frontend && npm run test:e2e

## Linting Commands

lint: ## Run linter on all services
	@echo "${GREEN}Running linter...${RESET}"
	@for service in product-service order-service auth-service payment-service content-service media-service email-service inventory-service analytics-service; do \
		echo "${YELLOW}Linting $$service...${RESET}"; \
		cd services/$$service && npm run lint && cd ../..; \
	done

lint-fix: ## Fix linting issues
	@echo "${GREEN}Fixing linting issues...${RESET}"
	@for service in product-service order-service auth-service payment-service content-service media-service email-service inventory-service analytics-service; do \
		echo "${YELLOW}Fixing $$service...${RESET}"; \
		cd services/$$service && npm run lint:fix && cd ../..; \
	done

## Installation Commands

install-deps: ## Install dependencies for all services
	@echo "${GREEN}Installing dependencies...${RESET}"
	@for service in product-service order-service auth-service payment-service content-service media-service email-service inventory-service analytics-service; do \
		echo "${YELLOW}Installing $$service dependencies...${RESET}"; \
		cd services/$$service && npm install && cd ../..; \
	done
	@echo "${YELLOW}Installing frontend dependencies...${RESET}"
	cd frontend && npm install && cd ..
	@echo "${YELLOW}Installing admin-panel dependencies...${RESET}"
	cd admin-panel && npm install && cd ..
	@echo "${YELLOW}Installing shared dependencies...${RESET}"
	cd shared && npm install && cd ..

## Deployment Commands

deploy: ## Deploy to OpenShift
	@echo "${GREEN}Deploying to OpenShift...${RESET}"
	./scripts/deploy-all.sh

deploy-service: ## Deploy specific service to OpenShift (make deploy-service service=product-service)
	@echo "${GREEN}Deploying $(service) to OpenShift...${RESET}"
	./scripts/deploy-service.sh $(service)

deploy-infra: ## Deploy infrastructure to OpenShift
	@echo "${GREEN}Deploying infrastructure to OpenShift...${RESET}"
	./scripts/setup-infra.sh

## Logging Commands

logs: ## View logs from all services
	docker-compose logs -f

logs-service: ## View logs from specific service (make logs-service service=product-service)
	docker-compose logs -f $(service)

## Cleanup Commands

clean: ## Clean up containers, volumes, and build artifacts
	@echo "${YELLOW}Cleaning up...${RESET}"
	docker-compose down -v
	@echo "${YELLOW}Removing build artifacts...${RESET}"
	find . -type d -name "node_modules" -prune -exec rm -rf {} \;
	find . -type d -name "dist" -prune -exec rm -rf {} \;
	find . -type d -name "build" -prune -exec rm -rf {} \;
	find . -type d -name ".next" -prune -exec rm -rf {} \;

clean-docker: ## Remove all Docker images and containers
	@echo "${YELLOW}Removing Docker images and containers...${RESET}"
	docker-compose down -v --rmi all
	docker system prune -af

## OpenShift Commands

oc-login: ## Login to OpenShift (requires OPENSHIFT_TOKEN and OPENSHIFT_SERVER env vars)
	@echo "${GREEN}Logging in to OpenShift...${RESET}"
	oc login --token=$${OPENSHIFT_TOKEN} --server=$${OPENSHIFT_SERVER}

oc-status: ## Check OpenShift deployment status
	@echo "${GREEN}Checking OpenShift status...${RESET}"
	oc project ecommerce
	oc get pods
	oc get routes

oc-logs: ## View OpenShift pod logs (make oc-logs service=product-service)
	@echo "${GREEN}Viewing logs for $(service)...${RESET}"
	oc logs -f deployment/$(service) -n ecommerce

## Utility Commands

generate-types: ## Generate TypeScript types from Prisma schemas
	@echo "${GREEN}Generating Prisma types...${RESET}"
	@for service in product-service order-service auth-service content-service inventory-service analytics-service; do \
		echo "${YELLOW}Generating types for $$service...${RESET}"; \
		cd services/$$service && npx prisma generate && cd ../..; \
	done

format: ## Format code with Prettier
	@echo "${GREEN}Formatting code...${RESET}"
	npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}"

docker-prune: ## Prune Docker system
	@echo "${YELLOW}Pruning Docker system...${RESET}"
	docker system prune -af --volumes

check-ports: ## Check if required ports are available
	@echo "${GREEN}Checking ports...${RESET}"
	@for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3010 5432 5433 5434 5435 5436 5437 6379 5672 8080 9000; do \
		if lsof -Pi :$$port -sTCP:LISTEN -t >/dev/null 2>&1; then \
			echo "${YELLOW}Port $$port is in use${RESET}"; \
		else \
			echo "${GREEN}Port $$port is available${RESET}"; \
		fi \
	done

health-check: ## Check health of all services
	@echo "${GREEN}Checking service health...${RESET}"
	@curl -s http://localhost:3001/health && echo " product-service: OK" || echo " product-service: FAIL"
	@curl -s http://localhost:3002/health && echo " order-service: OK" || echo " order-service: FAIL"
	@curl -s http://localhost:3003/health && echo " auth-service: OK" || echo " auth-service: FAIL"
	@curl -s http://localhost:3004/health && echo " payment-service: OK" || echo " payment-service: FAIL"
	@curl -s http://localhost:3005/health && echo " content-service: OK" || echo " content-service: FAIL"
	@curl -s http://localhost:3006/health && echo " media-service: OK" || echo " media-service: FAIL"
	@curl -s http://localhost:3007/health && echo " inventory-service: OK" || echo " inventory-service: FAIL"
	@curl -s http://localhost:3008/health && echo " analytics-service: OK" || echo " analytics-service: FAIL"

## Documentation Commands

docs-serve: ## Serve API documentation locally
	@echo "${GREEN}Serving API documentation...${RESET}"
	@echo "Opening Swagger UI at http://localhost:8080/api-docs"

## Initialize Commands

init: install-deps migrate seed ## Initialize project (install deps, migrate, seed)
	@echo "${GREEN}Project initialized successfully!${RESET}"

## Quick Start

quick-start: ## Quick start - setup and run everything
	@echo "${GREEN}==================================${RESET}"
	@echo "${GREEN}E-Commerce Quick Start${RESET}"
	@echo "${GREEN}==================================${RESET}"
	@echo ""
	@echo "${YELLOW}1. Installing dependencies...${RESET}"
	@make install-deps
	@echo ""
	@echo "${YELLOW}2. Starting infrastructure...${RESET}"
	@make dev-detached
	@echo ""
	@echo "${YELLOW}3. Waiting for databases to be ready...${RESET}"
	@sleep 10
	@echo ""
	@echo "${YELLOW}4. Running migrations...${RESET}"
	@make migrate
	@echo ""
	@echo "${YELLOW}5. Seeding data...${RESET}"
	@make seed
	@echo ""
	@echo "${GREEN}==================================${RESET}"
	@echo "${GREEN}✓ Setup complete!${RESET}"
	@echo "${GREEN}==================================${RESET}"
	@echo ""
	@echo "${YELLOW}Available URLs:${RESET}"
	@echo "  Frontend:     http://localhost:3000"
	@echo "  Admin Panel:  http://localhost:3010"
	@echo "  API Gateway:  http://localhost:8080"
	@echo "  RabbitMQ UI:  http://localhost:15672"
	@echo "  MinIO UI:     http://localhost:9001"
	@echo ""
