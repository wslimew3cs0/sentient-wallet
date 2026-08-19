SHELL := /bin/sh
COMPOSE := docker compose

.PHONY: help demo demo-detached full full-detached deploy stop logs ps config test backend-test contracts-test

help:
	@echo "Sentient Wallet local commands"
	@echo "  make demo           Browser Demo Mode at http://localhost:$${FRONTEND_PORT:-8080}"
	@echo "  make demo-detached  Start Browser Demo Mode in the background"
	@echo "  make full           Full Local Mode at http://localhost:$${FRONTEND_PORT:-8080}/?mode=full"
	@echo "  make full-detached  Start Full Local Mode in the background"
	@echo "  make deploy         Redeploy contracts to the running local Hardhat node"
	@echo "  make stop           Stop both modes and remove orphan containers"
	@echo "  make logs           Follow Full Local Mode logs"
	@echo "  make config         Validate and render the Full Local Compose model"
	@echo "  make test           Run isolated backend and contract tests"

demo:
	$(COMPOSE) up --build frontend

demo-detached:
	$(COMPOSE) up --build -d frontend

full:
	$(COMPOSE) --profile full up --build

full-detached:
	$(COMPOSE) --profile full up --build -d

deploy:
	$(COMPOSE) --profile full run --rm contracts-deploy

stop:
	$(COMPOSE) --profile full down --remove-orphans

logs:
	$(COMPOSE) --profile full logs -f --tail=150

ps:
	$(COMPOSE) --profile full ps

config:
	$(COMPOSE) --profile full config

test: backend-test contracts-test

backend-test:
	cd backend && .venv/bin/pytest

contracts-test:
	cd contracts && npm test
