# Multi-stage build for ShopService
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 5003
# Install curl for health checks
RUN apk add --no-cache curl

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY ["ShopService.csproj", "."]
RUN dotnet restore "./ShopService.csproj"
COPY . .
RUN dotnet build "ShopService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ShopService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_HTTP_PORTS=5003
ENTRYPOINT ["dotnet", "ShopService.dll"]
