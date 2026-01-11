# Multi-stage build for MasterdataService
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS base
WORKDIR /app
EXPOSE 5002

FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS build
WORKDIR /src
COPY ["MasterdataService.csproj", "."]
RUN dotnet restore "./MasterdataService.csproj"
COPY . .
RUN dotnet build "MasterdataService.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MasterdataService.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_HTTP_PORTS=5002
ENTRYPOINT ["dotnet", "MasterdataService.dll"]
