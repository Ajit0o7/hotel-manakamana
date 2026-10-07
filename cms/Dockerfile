# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# The runtime image has no C library, so the binaries must be fully static.
# "nodynamic" stops the WebP library from linking in its optional loader for
# a system libwebp (via purego), which would make the binary dynamic even with
# CGO disabled; it uses its built-in pure-Go encoder instead.
RUN CGO_ENABLED=0 go build -tags nodynamic -trimpath -ldflags="-s -w" -o /out/server ./cmd/server \
 && CGO_ENABLED=0 go build -tags nodynamic -trimpath -ldflags="-s -w" -o /out/migrate ./cmd/migrate
# Fail the build, not the deploy, if a dependency makes them dynamic again.
RUN apk add --no-cache file \
 && file /out/server /out/migrate \
 && ! file /out/server /out/migrate | grep -q "dynamically linked"

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/ /app/
EXPOSE 8080
ENTRYPOINT ["/app/server"]
