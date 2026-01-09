using Microsoft.Extensions.Hosting;

namespace ShopService.Services;

/// <summary>
/// Background service that periodically processes pending jobs from the OrderJobProcessor queue
/// </summary>
public class OrderJobProcessorHostedService : BackgroundService
{
    private readonly ILogger<OrderJobProcessorHostedService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly TimeSpan _processingInterval = TimeSpan.FromSeconds(5);

    public OrderJobProcessorHostedService(
        ILogger<OrderJobProcessorHostedService> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("OrderJobProcessorHostedService starting");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    var jobProcessor = scope.ServiceProvider.GetRequiredService<IOrderJobProcessor>();
                    await jobProcessor.ProcessPendingJobsAsync(stoppingToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing pending jobs");
            }

            // Wait before checking for more jobs
            await Task.Delay(_processingInterval, stoppingToken);
        }

        _logger.LogInformation("OrderJobProcessorHostedService stopping");
    }
}
