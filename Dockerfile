# common base image for development and production
FROM node:18 AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app


# dev image contains everything needed for testing, development and building
FROM base AS development
COPY package*.json ./

# first set aside prod dependencies so we can copy in to the prod image
RUN yarn install --pure-lockfile --production
RUN cp -R node_modules /tmp/node_modules

# install all dependencies and add source code
RUN yarn install --pure-lockfile
COPY . .

# builder runs unit tests and linter, then builds production code 
FROM development as builder
#RUN npm ci
# If your app use any other command to build, change here. If no build is needed, comment it off.
RUN yarn generate 
# RUN yarn build

# release includes bare minimum required to run the app, copied from builder
FROM base AS release
COPY --from=builder /tmp/node_modules ./node_modules
# If your app compiled file are in different location, change here, If the app does not need to be built, copy from ./
COPY --from=builder /app/ ./
#COPY --from=builder /app/package.json ./
RUN yarn generate
CMD ["yarn", "start"]
