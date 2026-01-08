using Microsoft.AspNetCore.Mvc;

namespace MasterdataService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DevInfoController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            return Ok(new { Service = "MasterdataService", Status = "OK" });
        }
    }
}
