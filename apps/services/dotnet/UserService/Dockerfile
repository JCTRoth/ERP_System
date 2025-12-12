FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS base
WORKDIR /app
EXPOSE 5000

# For development, we need write access to mounted volumes, so run as root
# Check if we're in development mode (source code mounted)
# If UserService.csproj exists, we're in dev mode, otherwise run published app
ENTRYPOINT ["sh", "-c", "if [ -f UserService.csproj ]; then dotnet watch run --urls http://0.0.0.0:5000; else dotnet UserService.dll; fi"]
