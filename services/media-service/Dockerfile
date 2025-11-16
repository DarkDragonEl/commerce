FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3008
CMD ["node", "dist/server.js"]
