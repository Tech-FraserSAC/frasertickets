# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies using npm ci
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine AS runner

# Set NODE_ENV to production
ENV NODE_ENV=production

# Set the working directory
WORKDIR /app

# Copy the package.json and package-lock.json to install only production dependencies
COPY package*.json ./

# Install only production dependencies using npm ci
RUN npm ci --omit=dev

# Copy the build output and other necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/package.json ./

# Expose the port the app runs on
EXPOSE 8080

# Start the Next.js application and listen on the port provided by the PORT environment variable
CMD ["sh", "-c", "npx next start -p $PORT"]

