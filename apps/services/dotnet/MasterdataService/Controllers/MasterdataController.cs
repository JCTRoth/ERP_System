using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using MasterdataService.Services;

namespace MasterdataService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MasterdataController : ControllerBase
    {
        private readonly ICustomerService _customerService;

        public MasterdataController(ICustomerService customerService)
        {
            _customerService = customerService;
        }

        [HttpGet("info")]
        public async Task<IActionResult> Info()
        {
            // Provide basic service info and a sample customer count
            var customers = await _customerService.GetAllAsync(0, 1);
            int countSample = customers is System.Collections.ICollection col ? col.Count : (customers == null ? 0 : 1);
            return Ok(new { Service = "MasterdataService", Status = "OK", SampleCustomerCount = countSample, Uptime = DateTime.UtcNow });
        }

        [HttpGet("customers")]
        public async Task<IActionResult> Customers()
        {
            var list = await _customerService.GetAllAsync(0, 100);
            return Ok(list);
        }
    }
}
