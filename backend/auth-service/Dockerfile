# Use the official Node.js 22 image as the base
FROM node:22-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose the port the app runs on
EXPOSE 5000

# Define environment variable for production
ENV NODE_ENV=production

# Start the application
CMD ["node", "dist/server.js"]
