FROM node:18-alpine

# Set up application
WORKDIR /usr/src/app

# Copy application files
COPY test-app/package*.json ./

# Install application dependencies
RUN npm install

# Copy application source
COPY test-app/ .

# Expose port
EXPOSE 3001

CMD [ "node", "server.js" ]
