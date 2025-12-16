using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using AccountingService.Services;
using AccountingService.DTOs;

namespace AccountingService.Controllers;

[ApiController]
[Route("api/[controller]")]
//[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IInvoiceService _invoiceService;

    public InvoicesController(IInvoiceService invoiceService)
    {
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetInvoices()
    {
        var invoices = await _invoiceService.GetAllAsync();
        return Ok(invoices);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoice(Guid id)
    {
        var invoice = await _invoiceService.GetByIdAsync(id);
        if (invoice == null)
            return NotFound();
        return Ok(invoice);
    }

    [HttpPost]
    public async Task<IActionResult> CreateInvoice([FromBody] CreateInvoiceInput request)
    {
        var invoice = await _invoiceService.CreateAsync(request);
        var dto = new InvoiceDto(
            invoice.Id,
            invoice.InvoiceNumber,
            invoice.Type.ToString(),
            invoice.Status.ToString(),
            invoice.CustomerId,
            invoice.SupplierId,
            invoice.CustomerName,
            invoice.SupplierName,
            invoice.IssueDate,
            invoice.DueDate,
            invoice.Subtotal,
            invoice.TaxAmount,
            invoice.Total,
            invoice.AmountPaid,
            invoice.AmountDue,
            invoice.Currency,
            invoice.CreatedAt
        );
        return CreatedAtAction(nameof(GetInvoice), new { id = invoice.Id }, dto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateInvoice(Guid id, [FromBody] UpdateInvoiceInput request)
    {
        var updateRequest = request with { Id = id };
        var invoice = await _invoiceService.UpdateAsync(updateRequest);
        if (invoice == null)
            return NotFound();
        return Ok(invoice);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteInvoice(Guid id)
    {
        var result = await _invoiceService.DeleteAsync(id);
        if (!result)
            return NotFound();
        return NoContent();
    }
}