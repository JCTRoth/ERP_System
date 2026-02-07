using System;

namespace UserService.Exceptions;

public class AuthenticationException : Exception
{
    public string ErrorCode { get; }

    public AuthenticationException(string errorCode, string message) : base(message)
    {
        ErrorCode = errorCode;
    }
}