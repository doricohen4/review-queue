.PHONY: install dev test lint typecheck ci fresh e2e

install:
	cd backend && composer install
	cd backend && cp -n .env.example .env || true
	cd backend && php artisan key:generate --force
	mkdir -p backend/database && touch backend/database/database.sqlite
	cd backend && php artisan migrate --seed --force
	cd frontend && npm install

dev:
	cd backend && php artisan serve --host=0.0.0.0 --port=8000 &
	cd frontend && npm run dev -- --host 0.0.0.0 --port 5173

test:
	cd backend && ./vendor/bin/pest
	cd frontend && npm run test:unit -- --run

lint:
	cd backend && ./vendor/bin/pint
	cd frontend && npm run lint

typecheck:
	cd frontend && npm run type-check

e2e:
	cd frontend && npm run test:e2e

ci:
	cd backend && ./vendor/bin/pint --test
	cd frontend && npm run ci
	cd backend && ./vendor/bin/pest

fresh:
	cd backend && php artisan migrate:fresh --seed --force
