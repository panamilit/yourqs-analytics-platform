using YourQS.API.DTOs;

namespace YourQS.API.Repositories.Interfaces;

public interface IProjectOverviewRepository
{
    Task<ProjectsSummaryDto> GetSummaryAsync();

    Task<ProjectsPageDto> GetProjectsAsync(
        ProjectOverviewQuery query);
}