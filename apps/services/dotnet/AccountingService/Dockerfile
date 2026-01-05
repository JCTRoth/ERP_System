# Development stage - uses SDK for dotnet watch
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS development
WORKDIR /app

# Copy project file and restore dependencies
COPY AccountingService.csproj .
RUN dotnet restore

# Copy everything for development
COPY . .

# Install curl for health checks
RUN apk add --no-cache curl

# Set environment variables
ENV ASPNETCORE_HTTP_PORTS=5001
ENV ASPNETCORE_ENVIRONMENT=Development

# Expose port
EXPOSE 5001

# For development, build and run the app
RUN dotnet build -c Release -o /app/out
ENTRYPOINT ["dotnet", "/app/out/AccountingService.dll"]

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["AccountingService.csproj", "."]
RUN dotnet restore "./AccountingService.csproj"
COPY . .
RUN dotnet build "AccountingService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "AccountingService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "AccountingService.dll"]
