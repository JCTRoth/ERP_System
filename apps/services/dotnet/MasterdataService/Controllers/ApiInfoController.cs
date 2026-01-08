using Microsoft.AspNetCore.Mvc;
using MasterdataService.Services;

namespace MasterdataService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApiInfoController : ControllerBase
{
    private readonly ICustomerService _customerService;

    public ApiInfoController(ICustomerService customerService)
    {
        _customerService = customerService;
    }

    /// <summary>
    /// Returns basic service information.
    /// </summary>
    [HttpGet("info")]
    public IActionResult Info()
    {
        return Ok(new { Service = "MasterdataService", Status = "OK", Version = "v1" });
    }

    /// <summary>
    /// Returns a small sample list of customers (first 5) for quick verification.
    /// </summary>
    [HttpGet("customers/sample")]
    public async Task<IActionResult> SampleCustomers()
    {
        var list = await _customerService.GetAllAsync();
        var sample = list.Take(5);
        return Ok(sample);
    }
}
