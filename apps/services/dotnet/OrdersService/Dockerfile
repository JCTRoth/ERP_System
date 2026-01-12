# Multi-stage build for OrdersService
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 5004
# Install curl for health checks
RUN apk add --no-cache curl

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY ["OrdersService.csproj", "."]
RUN dotnet restore "./OrdersService.csproj"
COPY . .
RUN dotnet build "OrdersService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "OrdersService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_HTTP_PORTS=5004
ENTRYPOINT ["dotnet", "OrdersService.dll"]

