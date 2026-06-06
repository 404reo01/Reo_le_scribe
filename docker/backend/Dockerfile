FROM node:20-slim

# mediasoup requires native compilation
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
