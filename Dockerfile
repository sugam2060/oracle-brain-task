FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies (including devDependencies for TypeScript build)
RUN npm install

# Copy all the source code into the container
COPY . .

# Generate Prisma Client specifically for the alpine container architecture
RUN npx prisma generate

# Compile TypeScript into the build/ directory
RUN npm run build

# Expose the port your Express server runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
