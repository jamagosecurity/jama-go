using JamGo.Api.Application.Interfaces;
using JamGo.Api.Application.Services;

namespace JamGo.Api.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IContactService, ContactService>();
        return services;
    }
}
