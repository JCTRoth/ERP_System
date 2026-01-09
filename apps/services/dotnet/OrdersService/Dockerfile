# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build

WORKDIR /src

# Copy project files
COPY ["apps/services/dotnet/OrdersService/OrdersService.csproj", "OrdersService/"]

# Restore dependencies
RUN dotnet restore "OrdersService/OrdersService.csproj"

# Copy source code
COPY ["apps/services/dotnet/OrdersService/", "OrdersService/"]

# Build
WORKDIR "/src/OrdersService"
RUN dotnet build "OrdersService.csproj" -c Release -o /app/build

# Development stage
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS development

WORKDIR /app

# Install watch tool for hot reload
RUN dotnet tool install -g dotnet-watch

ENV PATH="${PATH}:/root/.dotnet/tools"
ENV ASPNETCORE_URLS=http://+:5004
ENV ASPNETCORE_ENVIRONMENT=Development

EXPOSE 5004

ENTRYPOINT ["dotnet", "watch", "run", "--project", "OrdersService.csproj"]

