using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using ShopService.Services;
using ShopService.DTOs;
using ShopService.Data;
using ShopService.Models;

namespace ShopService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly ShopDbContext _context;
    private readonly IOrderJobProcessor _jobProcessor;

    public OrdersController(IOrderService orderService, ShopDbContext context, IOrderJobProcessor jobProcessor)
    {
        _orderService = orderService;
        _context = context;
        _jobProcessor = jobProcessor;
    }

    [HttpGet]
    public async Task<IActionResult> GetOrders()
    {
        var orders = await _orderService.GetAllAsync();
        var orderDtos = orders.Select(o => new OrderDto(
            o.Id,
            o.OrderNumber,
            o.CustomerId,
            o.Status.ToString(),
            o.PaymentStatus.ToString(),
            o.Subtotal,
            o.TaxAmount,
            o.ShippingAmount,
            o.DiscountAmount,
            o.Total,
            o.Currency,
            o.CreatedAt
        ));
        return Ok(orderDtos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetOrder(Guid id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null)
            return NotFound();
        var orderDto = new OrderDto(
            order.Id,
            order.OrderNumber,
            order.CustomerId,
            order.Status.ToString(),
            order.PaymentStatus.ToString(),
            order.Subtotal,
            order.TaxAmount,
            order.ShippingAmount,
            order.DiscountAmount,
            order.Total,
            order.Currency,
            order.CreatedAt
        );
        return Ok(orderDto);
    }

    [HttpPost]
    public async Task<IActionResult> CreateOrder([FromBody] CreateOrderInput request)
    {
        var order = await _orderService.CreateAsync(request);
        var orderDto = new OrderDto(
            order.Id,
            order.OrderNumber,
            order.CustomerId,
            order.Status.ToString(),
            order.PaymentStatus.ToString(),
            order.Subtotal,
            order.TaxAmount,
            order.ShippingAmount,
            order.DiscountAmount,
            order.Total,
            order.Currency,
            order.CreatedAt
        );
        return CreatedAtAction(nameof(GetOrder), new { id = order.Id }, orderDto);
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] UpdateOrderStatusInput request)
    {
        var updateRequest = request with { OrderId = id };
        var order = await _orderService.UpdateStatusAsync(updateRequest);
        if (order == null)
            return NotFound();
        var orderDto = new OrderDto(
            order.Id,
            order.OrderNumber,
            order.CustomerId,
            order.Status.ToString(),
            order.PaymentStatus.ToString(),
            order.Subtotal,
            order.TaxAmount,
            order.ShippingAmount,
            order.DiscountAmount,
            order.Total,
            order.Currency,
            order.CreatedAt
        );
        return Ok(orderDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> CancelOrder(Guid id, [FromQuery] string? reason)
    {
        var result = await _orderService.CancelAsync(id, reason);
        if (!result)
            return NotFound();
        return NoContent();
    }

    [HttpPost("process-external")]
    [AllowAnonymous]
    public async Task<IActionResult> ProcessExternalOrder([FromBody] ExternalOrderDto dto)
    {
        var existingOrder = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == dto.Id);

        if (existingOrder != null)
        {
            _context.Orders.Remove(existingOrder);
            await _context.SaveChangesAsync();
        }

        var order = new Order
        {
            Id = dto.Id,
            OrderNumber = dto.OrderNumber,
            CustomerId = dto.CustomerId,
            Status = Enum.TryParse<OrderStatus>(dto.Status, true, out var status) ? status : OrderStatus.Pending,
            Total = dto.TotalAmount,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Currency = "USD",
            Subtotal = dto.TotalAmount,
            TaxAmount = 0,
            ShippingAmount = 0,
            DiscountAmount = 0,
            PaymentStatus = PaymentStatus.Pending
        };

        foreach (var item in dto.Items)
        {
            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                OrderId = order.Id,
                ProductId = item.ProductId,
                ProductName = "Product " + item.ProductId,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                Total = item.Quantity * item.UnitPrice,
                Sku = "SKU-" + item.ProductId,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.Orders.Add(order);
        await _context.SaveChangesAsync();

        await _jobProcessor.EnqueueDocumentGenerationAsync(order.Id, "SHIPPED");

        return Ok(new { message = "Order synced and document generation triggered", orderId = order.Id });
    }
}

public class ExternalOrderDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime OrderDate { get; set; }
    public decimal TotalAmount { get; set; }
    public List<ExternalOrderItemDto> Items { get; set; } = new();
}

public class ExternalOrderItemDto
{
    public Guid ProductId { get; set; }
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
}
