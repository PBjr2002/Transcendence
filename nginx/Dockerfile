# Stage 1: Build with Node.js
FROM node:18-alpine AS vite-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN ls /app
ENV DOCKER_BUILD=true
RUN npm run build
RUN ls /app/dist

# Stage 2
FROM nginx:stable-alpine

# Install openssl
RUN apk update && apk add openssl

# Create self-signed SSL cert
RUN mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/self.key \
    -out /etc/nginx/ssl/self.crt \
    -subj "/C=PT/ST=Lisbon/L=Lisbon/O=42/CN=localhost"

COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=vite-builder /app/dist/ /usr/share/nginx/html

EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
