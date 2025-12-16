using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using ShopService.Data;
using ShopService.DTOs;
using Xunit;

namespace ShopService.Tests.Controllers;

public class ProductsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public ProductsControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetProducts_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/products");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateProduct_ReturnsCreated()
    {
        // Arrange
        var request = new CreateProductInput(
            Name: "Test Product",
            Description: null,
            Sku: "TEST-001",
            Ean: null,
            Price: 99.99m,
            CompareAtPrice: null,
            CostPrice: 50.00m,
            StockQuantity: 10,
            LowStockThreshold: null,
            TrackInventory: true,
            AllowBackorder: false,
            Weight: null,
            WeightUnit: null,
            Length: null,
            Width: null,
            Height: null,
            DimensionUnit: null,
            CategoryId: null,
            BrandId: null,
            SupplierId: null,
            Status: "active",
            IsFeatured: false,
            IsDigital: false,
            Slug: null,
            MetaTitle: null,
            MetaDescription: null
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/products", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var product = await response.Content.ReadFromJsonAsync<ProductDto>();
        product.Should().NotBeNull();
        product!.Name.Should().Be("Test Product");
    }

    [Fact]
    public async Task GetProduct_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Act
        var response = await _client.GetAsync("/api/products/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateProduct_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateProductInput(
            Id: id,
            Name: "Updated Product",
            Description: null,
            Sku: null,
            Ean: null,
            Price: null,
            CompareAtPrice: null,
            CostPrice: null,
            StockQuantity: null,
            LowStockThreshold: null,
            TrackInventory: null,
            AllowBackorder: null,
            Weight: null,
            WeightUnit: null,
            Length: null,
            Width: null,
            Height: null,
            DimensionUnit: null,
            CategoryId: null,
            BrandId: null,
            SupplierId: null,
            Status: null,
            IsFeatured: null,
            IsDigital: null,
            Slug: null,
            MetaTitle: null,
            MetaDescription: null
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/products/{id}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteProduct_ReturnsNotFound_WhenProductDoesNotExist()
    {
        // Act
        var response = await _client.DeleteAsync("/api/products/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<ShopDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ShopDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb");
            });

            // Seed data
            var sp = services.BuildServiceProvider();
            using var scope = sp.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ShopDbContext>();
            context.Database.EnsureCreated();

            // Disable authentication for tests
            services.AddAuthorization(options =>
            {
                options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                    .RequireAssertion(_ => true)
                    .Build();
            });
        });
    }
}