FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Hugging Face Spaces (Docker SDK) expects the app on port 7860
ENV PORT=7860
EXPOSE 7860

CMD ["npm", "start"]
