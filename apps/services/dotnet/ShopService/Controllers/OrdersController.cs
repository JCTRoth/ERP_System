using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopService.Services;
using ShopService.DTOs;

namespace ShopService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService)
    {
        _orderService = orderService;
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
}