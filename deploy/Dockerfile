# Builds the app and serves dist/ with nginx: hashed assets cached for a
# year, index.html and config.js never, the headers from deploy/csp.txt.
# API_URL at start writes config.js (docs/deploy.md); without it the
# container refuses to start unless MOCK=1.
#
#   docker build -f deploy/Dockerfile -t app .
#   docker run -e API_URL=https://api.acme.example -p 8080:80 app
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# No git here: prepare (the hooks) is skipped by --ignore-scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
ARG APP_COMMIT=""
ENV APP_COMMIT=$APP_COMMIT
RUN pnpm build

FROM nginx:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security.conf /etc/nginx/security.conf
COPY deploy/entrypoint.sh /docker-entrypoint.d/40-config.sh
RUN chmod +x /docker-entrypoint.d/40-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
