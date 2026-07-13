using JamGo.Api.Application.Common;
using JamGo.Api.Application.DTOs;

namespace JamGo.Api.Application.Interfaces;

public interface IContactService
{
    Task<PagedResult<ContactSubmissionDto>> GetPagedAsync(PaginationQuery query, CancellationToken ct = default);
    Task<ContactSubmissionDto> CreateAsync(CreateContactSubmissionRequest request, CancellationToken ct = default);
}
