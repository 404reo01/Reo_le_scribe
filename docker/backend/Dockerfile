FROM node:20-slim

# mediasoup requires native compilation
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip make g++ && rm -rf /var/lib/apt/lists/*

# Mirror the repo structure so ../../../../shared/types resolves correctly
WORKDIR /workspace

COPY shared/ shared/

WORKDIR /workspace/src/backend
COPY src/backend/package*.json ./
RUN npm ci

COPY src/backend/ .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
