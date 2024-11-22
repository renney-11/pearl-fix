FROM node:22-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code
COPY . .

# Expose the port
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=development

# Start the application
CMD ["npm", "run", "dev"]
