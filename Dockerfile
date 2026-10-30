FROM node:22-bookworm-slim
WORKDIR /app
COPY secondChance-backend/package*.json ./secondChance-backend/
RUN cd secondChance-backend && npm ci --omit=dev
COPY secondChance-backend/ ./secondChance-backend/
COPY secondChance-frontend/build/ ./secondChance-frontend/build/
WORKDIR /app/secondChance-backend
ENV PORT=3060
EXPOSE 3060
CMD ["node", "app.js"]
