# Use a lightweight Node image
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build app (optional if using start:dev)
RUN npm run build

# Expose port
EXPOSE 3000
EXPOSE 5555

# Default command (can be overridden by docker-compose)
CMD ["npm", "run", "start:dev"]
