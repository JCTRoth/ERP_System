using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using MasterdataService.DTOs;
using MasterdataService.Models;
using Xunit;

namespace MasterdataService.Tests.Controllers;

public class CustomersControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private readonly HttpClient _client;

    public CustomersControllerTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task GetCustomers_ReturnsOk()
    {
        // Act
        var response = await _client.GetAsync("/api/customers");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateCustomer_ReturnsCreated()
    {
        // Arrange
        var request = new CreateCustomerInput(
            Name: "Test Customer",
            LegalName: null,
            Type: "individual",
            ContactPerson: null,
            Email: "test@example.com",
            Phone: null,
            Fax: null,
            Website: null,
            TaxId: null,
            Currency: null,
            DefaultCurrencyId: null,
            DefaultPaymentTermId: null,
            PaymentTermDays: null,
            CreditLimit: null,
            Notes: null,
            Addresses: null,
            Contacts: null
        );

        // Act
        var response = await _client.PostAsJsonAsync("/api/customers", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var customer = await response.Content.ReadFromJsonAsync<Customer>();
        customer.Should().NotBeNull();
        customer!.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task GetCustomer_ReturnsNotFound_WhenCustomerDoesNotExist()
    {
        // Act
        var response = await _client.GetAsync("/api/customers/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateCustomer_ReturnsNotFound_WhenCustomerDoesNotExist()
    {
        // Arrange
        var id = Guid.NewGuid();
        var request = new UpdateCustomerInput(
            Name: "Updated Customer",
            Type: null,
            ContactPerson: null,
            Email: "updated@example.com",
            Phone: null,
            Fax: null,
            Website: null,
            TaxId: null,
            DefaultCurrencyId: null,
            DefaultPaymentTermId: null,
            CreditLimit: null,
            Status: null,
            Notes: null
        );

        // Act
        var response = await _client.PutAsJsonAsync($"/api/customers/{id}", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteCustomer_ReturnsNotFound_WhenCustomerDoesNotExist()
    {
        // Act
        var response = await _client.DeleteAsync("/api/customers/00000000-0000-0000-0000-000000000000");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}