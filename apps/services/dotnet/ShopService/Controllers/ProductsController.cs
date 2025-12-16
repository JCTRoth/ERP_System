using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using ShopService.Services;
using ShopService.DTOs;

namespace ShopService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts()
    {
        var products = await _productService.GetAllAsync();
        var productDtos = products.Select(p => new ProductDto(
            p.Id,
            p.Name,
            p.Description,
            p.Sku,
            p.Ean,
            p.Price,
            p.CompareAtPrice,
            p.CostPrice,
            p.StockQuantity,
            p.Status.ToString(),
            p.IsFeatured,
            p.Slug,
            p.CategoryId,
            p.BrandId,
            p.CreatedAt,
            p.UpdatedAt
        ));
        return Ok(productDtos);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetProduct(Guid id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null)
            return NotFound();
        var productDto = new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Sku,
            product.Ean,
            product.Price,
            product.CompareAtPrice,
            product.CostPrice,
            product.StockQuantity,
            product.Status.ToString(),
            product.IsFeatured,
            product.Slug,
            product.CategoryId,
            product.BrandId,
            product.CreatedAt,
            product.UpdatedAt
        );
        return Ok(productDto);
    }

    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductInput request)
    {
        var product = await _productService.CreateAsync(request);
        var productDto = new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Sku,
            product.Ean,
            product.Price,
            product.CompareAtPrice,
            product.CostPrice,
            product.StockQuantity,
            product.Status.ToString(),
            product.IsFeatured,
            product.Slug,
            product.CategoryId,
            product.BrandId,
            product.CreatedAt,
            product.UpdatedAt
        );
        return CreatedAtAction(nameof(GetProduct), new { id = product.Id }, productDto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductInput request)
    {
        var updateRequest = request with { Id = id };
        var product = await _productService.UpdateAsync(updateRequest);
        if (product == null)
            return NotFound();
        var productDto = new ProductDto(
            product.Id,
            product.Name,
            product.Description,
            product.Sku,
            product.Ean,
            product.Price,
            product.CompareAtPrice,
            product.CostPrice,
            product.StockQuantity,
            product.Status.ToString(),
            product.IsFeatured,
            product.Slug,
            product.CategoryId,
            product.BrandId,
            product.CreatedAt,
            product.UpdatedAt
        );
        return Ok(productDto);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id)
    {
        var result = await _productService.DeleteAsync(id);
        if (!result)
            return NotFound();
        return NoContent();
    }
}