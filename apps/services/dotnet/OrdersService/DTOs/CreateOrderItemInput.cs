namespace OrdersService.DTOs;

public class CreateOrderItemInput
{
    public required Guid ProductId { get; set; }
    public required int Quantity { get; set; }
    public required decimal UnitPrice { get; set; }
}
