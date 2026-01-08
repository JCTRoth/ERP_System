using Microsoft.AspNetCore.Mvc;

namespace AccountingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DevInfoController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { Service = "AccountingService", Status = "OK" });
        }
    }
}
