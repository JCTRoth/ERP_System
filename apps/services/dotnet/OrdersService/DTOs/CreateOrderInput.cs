namespace OrdersService.DTOs;

public class CreateOrderInput
{
    public required string OrderNumber { get; set; }
    public required Guid CustomerId { get; set; }
    public required Guid CompanyId { get; set; }
    public DateTime DueDate { get; set; }
    public List<CreateOrderItemInput> Items { get; set; } = new();
}
