using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Authorization;
using AccountingService.Data;
using AccountingService.DTOs;
using Xunit;

namespace AccountingService.Tests.Controllers;

public class InvoicesControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public InvoicesControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetInvoices_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/invoices");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateInvoice_ReturnsCreated()
    {
        // Arrange
        var request = new CreateInvoiceInput(
            Type: "SalesInvoice",
            CustomerId: Guid.NewGuid(),
            SupplierId: null,
            OrderId: null,
            OrderNumber: null,
            CustomerName: null,
            SupplierName: null,
            BillingAddress: null,
            BillingCity: null,
            BillingPostalCode: null,
            BillingCountry: null,
            VatNumber: null,
            IssueDate: null,
            DueDate: DateTime.UtcNow.AddDays(30),
            TaxRate: 0.19m,
            Notes: null,
            PaymentTerms: null,
            LineItems: new List<CreateInvoiceLineItemInput>
            {
                new CreateInvoiceLineItemInput(
                    Description: "Test Item",
                    Sku: null,
                    ProductId: null,
                    AccountId: null,
                    Quantity: 1,
                    Unit: "pcs",
                    UnitPrice: 100.00m,
                    DiscountPercent: 0,
                    TaxRate: 0.19m
                )
            }
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/invoices", request);

        // Assert
        if (response.StatusCode != HttpStatusCode.Created)
        {
            var content = await response.Content.ReadAsStringAsync();
            throw new Exception($"Expected 201, got {response.StatusCode}. Response: {content}");
        }
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var invoice = await response.Content.ReadFromJsonAsync<InvoiceDto>();
        invoice.Should().NotBeNull();
    }

    [Fact]
    public async Task GetInvoice_ReturnsNotFound_WhenInvoiceDoesNotExist()
    {
        // Act
        var response = await _client.GetAsync("/api/invoices/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateInvoice_ReturnsNotFound_WhenInvoiceDoesNotExist()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateInvoiceInput(
            Id: id,
            Type: null,
            CustomerId: null,
            SupplierId: null,
            CustomerName: null,
            SupplierName: null,
            BillingAddress: null,
            BillingCity: null,
            BillingPostalCode: null,
            BillingCountry: null,
            VatNumber: null,
            IssueDate: null,
            DueDate: null,
            TaxRate: null,
            Notes: "Updated",
            PaymentTerms: null,
            LineItems: null
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/invoices/{id}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteInvoice_ReturnsNotFound_WhenInvoiceDoesNotExist()
    {
        // Act
        var response = await _client.DeleteAsync("/api/invoices/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}

public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AccountingDbContext>));

            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<AccountingDbContext>(options =>
            {
                options.UseInMemoryDatabase("TestDb");
            });

            services.AddAuthorization(options =>
            {
                options.DefaultPolicy = new AuthorizationPolicyBuilder()
                    .RequireAssertion(_ => true)
                    .Build();
            });
        });
    }
}