using YourQS.API.DTOs;

namespace YourQS.API.Services.Interfaces
{
    public interface IWhatIfService
    {
        Task<WhatIfCalculationOutcome> CalculateAsync(MaterialWhatIfRequestDto request);
    }
}
