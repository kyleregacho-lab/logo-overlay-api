FROM node:20-slim

RUN apt-get update && apt-get install -y \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY logo-white.svg ./
COPY fonts ./fonts
COPY index.js ./

EXPOSE 3000

CMD ["node", "index.js"]
