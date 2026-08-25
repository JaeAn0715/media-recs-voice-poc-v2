# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS web
WORKDIR /repo
COPY shared ./shared
COPY Web/package.json Web/package-lock.json ./Web/
WORKDIR /repo/Web
RUN npm ci
COPY Web ./
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /repo
ENV NODE_ENV=production
ENV PORT=8080
ENV WEB_DIST_PATH=/repo/Web/dist
COPY shared ./shared
COPY Backend/package.json Backend/package-lock.json ./Backend/
WORKDIR /repo/Backend
RUN npm ci --omit=dev
COPY Backend ./
COPY --from=web /repo/Web/dist /repo/Web/dist
EXPOSE 8080
CMD ["npx", "tsx", "src/index.ts"]
