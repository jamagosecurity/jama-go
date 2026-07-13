using JamGo.Api.Application.Common;
using JamGo.Api.Application.DTOs;
using JamGo.Api.Application.Interfaces;
using JamGo.Api.Domain.Entities;
using JamGo.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JamGo.Api.Application.Services;

public class ContactService(AppDbContext db) : IContactService
{
    public async Task<PagedResult<ContactSubmissionDto>> GetPagedAsync(
        PaginationQuery query,
        CancellationToken ct = default)
    {
        var source = db.ContactSubmissions.AsNoTracking().OrderByDescending(x => x.CreatedAt);
        var total = await source.CountAsync(ct);
        var items = await source
            .Skip(query.Skip)
            .Take(query.NormalizedPageSize)
            .Select(x => new ContactSubmissionDto(
                x.Id,
                x.FullName,
                x.Email,
                x.Phone,
                x.Service,
                x.Message,
                x.Status,
                x.CreatedAt))
            .ToListAsync(ct);

        return new PagedResult<ContactSubmissionDto>
        {
            Items = items,
            Page = query.NormalizedPage,
            PageSize = query.NormalizedPageSize,
            TotalCount = total,
        };
    }

    public async Task<ContactSubmissionDto> CreateAsync(
        CreateContactSubmissionRequest request,
        CancellationToken ct = default)
    {
        var entity = new ContactSubmission
        {
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Service = request.Service.Trim(),
            Message = request.Message.Trim(),
        };

        db.ContactSubmissions.Add(entity);
        await db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    private static ContactSubmissionDto MapToDto(ContactSubmission entity) =>
        new(entity.Id, entity.FullName, entity.Email, entity.Phone, entity.Service, entity.Message, entity.Status, entity.CreatedAt);
}
