using JamGo.Api.Infrastructure.Caching;
using JamGo.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JamGo.Api.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(config.GetConnectionString("DefaultConnection")));

        var redis = config.GetConnectionString("Redis");
        if (!string.IsNullOrWhiteSpace(redis))
        {
            services.AddStackExchangeRedisCache(options =>
            {
                options.Configuration = redis;
                options.InstanceName = "JamGo_";
            });
            services.AddSingleton<ICacheService, RedisCacheService>();
        }
        else
        {
            services.AddDistributedMemoryCache();
            services.AddSingleton<ICacheService, RedisCacheService>();
        }

        return services;
    }
}
