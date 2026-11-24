FROM php:8.4-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .

RUN composer install --no-interaction --prefer-dist \
    && cp -n .env.example .env \
    && php artisan key:generate --force \
    && mkdir -p database \
    && touch database/database.sqlite

EXPOSE 8000

# Bind all interfaces so the container is reachable from the frontend service.
CMD ["sh", "-c", "php artisan migrate --seed --force && php artisan serve --host=0.0.0.0 --port=${PORT:-8000}"]
