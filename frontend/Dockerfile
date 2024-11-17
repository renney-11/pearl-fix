# Use Node.js version 22
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the application code
COPY . .

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=development

# Start the application
CMD ["npm", "run", "dev"]
