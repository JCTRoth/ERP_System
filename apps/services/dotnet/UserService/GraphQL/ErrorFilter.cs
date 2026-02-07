using HotChocolate;
using UserService.Exceptions;

namespace UserService.GraphQL;

public class ErrorFilter : IErrorFilter
{
    public IError OnError(IError error)
    {
        if (error.Exception is AuthenticationException authEx)
        {
            return error
                .WithCode(authEx.ErrorCode)
                .WithMessage(authEx.Message);
        }

        return error;
    }
}