FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --production

# Copy source code
COPY src ./src
COPY public ./public
# Copy .env example if available, otherwise we rely on runtime env vars
# COPY .env .env 

# Copy agent artifacts
# We assume the build context includes the 'agent' folder at the root level alongside BACKEND
# OR we will handle the context in docker-compose to include 'agent'
# Standard Docker build context for BACKEND usually only includes BACKEND folder.
# To copy agent files, we might need to change the build context in docker-compose or copy them before build.
# For now, let's assume the build context is the project root, so we COPY agent stuff relative to root.
# Wait, if context is project root, then "COPY package.json" refers to root package.json? No.
# The user's structure:
# /Test
#   /BACKEND
#   /agent
#   /frontend
#
# If I set build context to /Test, then:
# COPY BACKEND/package*.json ./
# COPY BACKEND/src ./src
# COPY agent ./agent

# Let's write the Dockerfile assuming the build context is the Repostiory Root (/Test)
COPY BACKEND/package*.json ./
RUN npm install --production

COPY BACKEND/src ./src
COPY BACKEND/public ./public

# Copy agent builds and assets
COPY agent/build ./agent/build
COPY agent/assets ./agent/assets

# Set environment variables for the app to find the agent files
ENV AGENT_DIST_DIR=/app/agent/build
ENV AGENT_ASSET_DIR=/app/agent/assets
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
