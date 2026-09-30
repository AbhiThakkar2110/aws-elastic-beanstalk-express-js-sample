FROM node:16-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY app.js ./

EXPOSE 8080

USER node

CMD ["node", "app.js"]
