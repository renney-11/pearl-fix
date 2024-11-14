# Use the official Node.js 22 image as the base
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port on which your app runs
EXPOSE 3000

# Define the command to start the app
CMD ["npm", "start"]
