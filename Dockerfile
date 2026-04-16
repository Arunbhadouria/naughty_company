# Use the lightweight Alpine version of Node.js 18
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production

# Bundle app source
COPY . .

# Expose the API port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run as non-root user for security
USER node

# Command to run the application
CMD [ "node", "server.js" ]
