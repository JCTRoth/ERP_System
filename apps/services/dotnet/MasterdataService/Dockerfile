# Development stage - uses SDK for dotnet watch
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS development
WORKDIR /app

# Copy everything for development
COPY . .

# Install curl for health checks
RUN apk add --no-cache curl

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5002
ENV ASPNETCORE_ENVIRONMENT=Development

# Expose port
EXPOSE 5002

# For development, run with dotnet watch for hot reload
ENTRYPOINT ["dotnet", "watch", "run", "--urls", "http://0.0.0.0:5002"]

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["MasterdataService.csproj", "."]
RUN dotnet restore

# Copy the rest of the source code
COPY . .

# Build the application
RUN dotnet build -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy published app
COPY --from=publish /app/publish .

# Set environment variables
ENV ASPNETCORE_URLS=http://+:5002
ENV ASPNETCORE_ENVIRONMENT=Production

# Expose port
EXPOSE 5002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1

# For production, run the published app
ENTRYPOINT ["dotnet", "MasterdataService.dll"]
