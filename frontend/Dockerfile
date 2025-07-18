# frontend/Dockerfile

FROM node:18-alpine AS build
WORKDIR /app
COPY . .

ARG VITE_MOVIE_ID
ARG VITE_MOVIE_URL
# Vite only picks up env vars prefixed VITE_ at build time
ENV VITE_MOVIE_ID=$VITE_MOVIE_ID
ENV VITE_MOVIE_URL=$VITE_MOVIE_URL

# ARG REACT_APP_MOVIE_URL
# ENV REACT_APP_MOVIE_URL=$REACT_APP_MOVIE_URL

RUN npm ci && npm run build

FROM nginx:stable-alpine AS production
# copy the *main* nginx.conf over
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# static assets from the build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]