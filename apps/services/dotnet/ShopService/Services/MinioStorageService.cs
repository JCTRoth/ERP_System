using System.Text;
using System.Text.Json;
using Minio;
using Minio.DataModel.Args;

namespace ShopService.Services;

/// <summary>
/// Client for MinIO S3-compatible object storage
/// </summary>
public class MinioStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly ILogger<MinioStorageService> _logger;
    private readonly string _bucketPrefix;

    public MinioStorageService(IMinioClient minioClient, ILogger<MinioStorageService> logger, IConfiguration configuration)
    {
        _minioClient = minioClient;
        _logger = logger;
        _bucketPrefix = configuration.GetValue<string>("Minio:BucketPrefix") ?? "documents";
    }

    /// <summary>
    /// Get bucket name for a company
    /// </summary>
    private string GetBucketName(string companyId)
    {
        return $"{_bucketPrefix}-{companyId}";
    }

    /// <summary>
    /// Ensure bucket exists for company, create if not
    /// </summary>
    public async Task EnsureBucketExistsAsync(string companyId, CancellationToken cancellationToken = default)
    {
        var bucketName = GetBucketName(companyId);
        
        try
        {
            var bucketExists = await _minioClient.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(bucketName), 
                cancellationToken);

            if (!bucketExists)
            {
                await _minioClient.MakeBucketAsync(
                    new MakeBucketArgs().WithBucket(bucketName), 
                    cancellationToken);
                _logger.LogInformation("Created MinIO bucket: {BucketName}", bucketName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ensuring bucket exists: {BucketName}", bucketName);
            throw;
        }
    }

    /// <summary>
    /// Upload PDF document to MinIO
    /// </summary>
    /// <param name="companyId">Company ID for bucket selection</param>
    /// <param name="objectKey">Object key/path (e.g., "orders/order-123/invoice-20260109.pdf")</param>
    /// <param name="pdfBytes">PDF file bytes</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Presigned URL to access the document (valid for 7 days)</returns>
    public async Task<string> UploadPdfAsync(
        string companyId, 
        string objectKey, 
        byte[] pdfBytes, 
        CancellationToken cancellationToken = default)
    {
        var bucketName = GetBucketName(companyId);
        
        try
        {
            await EnsureBucketExistsAsync(companyId, cancellationToken);

            using var stream = new MemoryStream(pdfBytes);
            
            await _minioClient.PutObjectAsync(
                new PutObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectKey)
                    .WithStreamData(stream)
                    .WithObjectSize(pdfBytes.Length)
                    .WithContentType("application/pdf"),
                cancellationToken);

            _logger.LogInformation("Uploaded PDF to MinIO: {BucketName}/{ObjectKey}", bucketName, objectKey);

            // Generate presigned URL (valid for 7 days)
            var presignedUrl = await _minioClient.PresignedGetObjectAsync(
                new PresignedGetObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectKey)
                    .WithExpiry(60 * 60 * 24 * 7)); // 7 days in seconds

            return presignedUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading PDF to MinIO: {BucketName}/{ObjectKey}", bucketName, objectKey);
            throw;
        }
    }

    /// <summary>
    /// Get presigned URL for existing object
    /// </summary>
    public async Task<string> GetPresignedUrlAsync(
        string companyId, 
        string objectKey, 
        int expiryInHours = 1,
        CancellationToken cancellationToken = default)
    {
        var bucketName = GetBucketName(companyId);
        
        try
        {
            var presignedUrl = await _minioClient.PresignedGetObjectAsync(
                new PresignedGetObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectKey)
                    .WithExpiry(expiryInHours * 3600));

            return presignedUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating presigned URL: {BucketName}/{ObjectKey}", bucketName, objectKey);
            throw;
        }
    }

    /// <summary>
    /// Delete object from MinIO
    /// </summary>
    public async Task DeleteObjectAsync(
        string companyId, 
        string objectKey,
        CancellationToken cancellationToken = default)
    {
        var bucketName = GetBucketName(companyId);
        
        try
        {
            await _minioClient.RemoveObjectAsync(
                new RemoveObjectArgs()
                    .WithBucket(bucketName)
                    .WithObject(objectKey),
                cancellationToken);

            _logger.LogInformation("Deleted object from MinIO: {BucketName}/{ObjectKey}", bucketName, objectKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting object from MinIO: {BucketName}/{ObjectKey}", bucketName, objectKey);
            throw;
        }
    }
}
