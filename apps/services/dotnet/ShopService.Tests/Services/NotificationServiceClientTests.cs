using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using ShopService.Services;
using Xunit;

namespace ShopService.Tests.Services;

public class NotificationServiceClientTests
{
    private sealed class FakeHttpMessageHandler : HttpMessageHandler
    {
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastContent { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastContent = request.Content != null
                ? await request.Content.ReadAsStringAsync(cancellationToken)
                : null;

            const string responseJson = "{\"data\":{\"sendEmail\":{\"id\":\"123\",\"status\":\"PENDING\"}}}";

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(responseJson, Encoding.UTF8, "application/json")
            };
        }
    }

    [Fact]
    public async Task SendOrderStatusEmail_SendsGraphQLRequest_AndReturnsTrueOnSuccess()
    {
        // Arrange
        var handler = new FakeHttpMessageHandler();
        var httpClient = new HttpClient(handler)
        {
            BaseAddress = new Uri("http://localhost:8082")
        };

        using var loggerFactory = LoggerFactory.Create(builder => builder.AddDebug());
        var logger = loggerFactory.CreateLogger<NotificationServiceClient>();

        var client = new NotificationServiceClient(httpClient, logger);

        // Act
        var result = await client.SendOrderStatusEmailAsync(
            customerEmail: "test@example.com",
            orderNumber: "ORD-123",
            status: "CONFIRMED",
            trackingNumber: "TRACK-1",
            pdfUrl: "https://example.com/doc.pdf");

        // Assert
        result.Should().BeTrue();

        handler.LastRequest.Should().NotBeNull();
        handler.LastRequest!.RequestUri!.AbsolutePath.Should().Be("/graphql");

        handler.LastContent.Should().NotBeNull();
        var root = JsonSerializer.Deserialize<JsonElement>(handler.LastContent!);

        var query = root.GetProperty("query").GetString();
        query.Should().Contain("sendEmail(input: $input) {");

        var input = root.GetProperty("variables").GetProperty("input");
        input.GetProperty("toEmail").GetString().Should().Be("test@example.com");
        input.GetProperty("subject").GetString().Should().Contain("ORD-123");
        input.GetProperty("templateName").GetString().Should().Be("order-confirmation");

        // Template data should include the order id
        input.TryGetProperty("templateData", out var templateData).Should().BeTrue();
        templateData.ValueKind.Should().Be(JsonValueKind.Object);
        templateData.GetProperty("orderId").GetString().Should().Be("ORD-123");
    }
}
