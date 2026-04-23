FROM node:20.14-alpine as development
RUN mkdir -p /app
WORKDIR /app
COPY package*.json ./
RUN npm ci --development --ignore-scripts
COPY . .
RUN npm run build

FROM node:20.14-alpine as production
RUN apk add --no-cache tzdata
ENV TZ UTC
RUN mkdir -p /app
WORKDIR /app
COPY package*.json ./
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
RUN npm ci --production --ignore-scripts
COPY . .
COPY --from=development /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
