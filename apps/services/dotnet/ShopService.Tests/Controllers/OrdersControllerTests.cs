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

public class OrdersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public OrdersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetOrders_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/orders");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateOrder_ReturnsCreated()
    {
        // Create a product first
        var createProductDto = new CreateProductInput(
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
        var productResponse = await _client.PostAsJsonAsync("/api/products", createProductDto);
        productResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var createdProduct = await productResponse.Content.ReadFromJsonAsync<ProductDto>();
        createdProduct.Should().NotBeNull();

        // Arrange
        var request = new CreateOrderInput(
            CustomerId: Guid.NewGuid(), // Random customer ID
            Items: new List<CreateOrderItemInput>
            {
                new CreateOrderItemInput(
                    ProductId: createdProduct.Id,
                    VariantId: null,
                    Quantity: 1
                )
            },
            Notes: null,
            ShippingName: null,
            ShippingAddress: null,
            ShippingCity: null,
            ShippingPostalCode: null,
            ShippingCountry: null,
            ShippingPhone: null,
            BillingName: null,
            BillingAddress: null,
            BillingCity: null,
            BillingPostalCode: null,
            BillingCountry: null,
            ShippingMethodId: null,
            CouponCode: null
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/orders", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var order = await response.Content.ReadFromJsonAsync<OrderDto>();
        order.Should().NotBeNull();
    }

    [Fact]
    public async Task GetOrder_ReturnsNotFound_WhenOrderDoesNotExist()
    {
        // Act
        var response = await _client.GetAsync("/api/orders/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateOrderStatus_ReturnsNotFound_WhenOrderDoesNotExist()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateOrderStatusInput(
            OrderId: id,
            Status: "shipped",
            TrackingNumber: null,
            InternalNotes: null
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/orders/{id}/status", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CancelOrder_ReturnsNotFound_WhenOrderDoesNotExist()
    {
        // Act
        var response = await _client.DeleteAsync("/api/orders/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}