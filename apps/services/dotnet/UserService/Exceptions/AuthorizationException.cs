namespace UserService.Exceptions;

public class AuthorizationException : Exception
{
    public string ErrorCode { get; }

    public AuthorizationException(string errorCode, string message) : base(message)
    {
        ErrorCode = errorCode;
    }
}
