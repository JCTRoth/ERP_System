namespace ShopService.Models;

/// <summary>
/// Represents a document generated for an order (e.g., invoice, shipping notice)
/// </summary>
public class OrderDocument
{
    public Guid Id { get; set; }
    
    public Guid OrderId { get; set; }
    
    /// <summary>
    /// Type of document (e.g., "invoice", "orderConfirmation", "shippingNotice")
    /// </summary>
    public string DocumentType { get; set; } = string.Empty;
    
    /// <summary>
    /// Order state when this document was generated (e.g., "confirmed", "shipped")
    /// </summary>
    public string State { get; set; } = string.Empty;
    
    /// <summary>
    /// Min.io URL to the PDF document
    /// </summary>
    public string PdfUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// Timestamp when the document was generated
    /// </summary>
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Template ID used to generate this document
    /// </summary>
    public string? TemplateId { get; set; }
    
    /// <summary>
    /// Template key used to generate this document
    /// </summary>
    public string? TemplateKey { get; set; }
    
    // Navigation property
    public Order? Order { get; set; }
}
