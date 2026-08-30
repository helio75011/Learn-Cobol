# syntax=docker/dockerfile:1
#
# Image de l'API Learn-Cobol.
# Le contexte de build est la RACINE du projet : le conteneur reproduit la même
# arborescence que la machine hôte (/app/backend + /app/frontend), pour que les
# chemins calculés dans src/config/env.js restent valables.

# ---- dépendances (couche mise en cache tant que le lock ne bouge pas) --------
FROM node:24-alpine AS deps
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# ---- développement : nodemon + code monté en volume ------------------------
FROM node:24-alpine AS dev
ENV NODE_ENV=development
WORKDIR /app/backend
COPY --from=deps /app/backend/node_modules ./node_modules
COPY backend ./
COPY frontend /app/frontend
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- production : dépendances de run seules, utilisateur non privilégié -----
FROM node:24-alpine AS production
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY backend ./
COPY frontend /app/frontend
USER node
EXPOSE 3000
CMD ["node", "server.js"]
