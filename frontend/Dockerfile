# frontend/Dockerfile

# Use Node 20 to satisfy Vite/react-router peer requirements
FROM node:20-alpine AS build

WORKDIR /app
COPY . .

# Define build-time variables (must be prefixed with VITE_ for Vite to use them)
ARG VITE_MOVIE_ID
ARG VITE_MOVIE_URL

# Export them as environment variables during build
ENV VITE_MOVIE_ID=$VITE_MOVIE_ID
ENV VITE_MOVIE_URL=$VITE_MOVIE_URL

# Install dependencies and build the app
RUN npm ci && npm run build

# Use NGINX to serve the production build
FROM nginx:stable-alpine AS production

# Copy nginx configuration files
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy the build output to nginx's html directory
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]