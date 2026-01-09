using OrdersService.Models;

namespace OrdersService.DTOs;

public class UpdateOrderStatusInput
{
    public required OrderStatus Status { get; set; }
}
