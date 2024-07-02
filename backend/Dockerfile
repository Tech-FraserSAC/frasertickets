# STEP 1: Build an executable binary
FROM golang:alpine AS builder

# Install Git to fetch dependencies
RUN apk update && apk add --no-cache git ca-certificates tzdata build-base vips vips-dev && update-ca-certificates
WORKDIR $GOPATH/src/mypackage/myapp/
COPY . .

# Fetch dependencies using go mod
RUN go mod download
RUN go mod verify

# Build binary
RUN go build -o /go/bin/frasertickets_backend

# STEP 2: Build image with executable and necessary deps
FROM alpine
RUN apk update && apk add --no-cache ca-certificates tzdata vips vips-dev && update-ca-certificates
COPY --from=builder /go/bin/frasertickets_backend /go/bin/frasertickets_backend

# Import necessary data
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

# Set up environment variables
ENV FRASERTICKETS_ENV production
ENV PORT 3000

# Expose port
EXPOSE 3000

# Run backend
ENTRYPOINT ["/go/bin/frasertickets_backend"]