using HotChocolate.ApolloFederation;
using HotChocolate.Types;
using HotChocolate.Types.Relay;
using UserService.Models;

namespace UserService.GraphQL;

public class UserType : ObjectType<User>
{
    protected override void Configure(IObjectTypeDescriptor<User> descriptor)
    {
        descriptor.Name("User");

        descriptor.Field(u => u.Id)
            .Type<NonNullType<IdType>>();

        descriptor.Field(u => u.Email)
            .Type<NonNullType<StringType>>();

        descriptor.Field(u => u.FirstName)
            .Type<StringType>();

        descriptor.Field(u => u.LastName)
            .Type<StringType>();

        descriptor.Field(u => u.FullName)
            .Type<NonNullType<StringType>>();

        descriptor.Field(u => u.IsActive)
            .Type<NonNullType<BooleanType>>();

        descriptor.Field(u => u.EmailVerified)
            .Type<NonNullType<BooleanType>>();

        descriptor.Field(u => u.PreferredLanguage)
            .Type<StringType>();

        descriptor.Field(u => u.CreatedAt)
            .Type<NonNullType<DateTimeType>>();

        descriptor.Field(u => u.LastLoginAt)
            .Type<DateTimeType>();

        // Ignore sensitive fields
        descriptor.Field(u => u.PasswordHash).Ignore();
        descriptor.Field(u => u.RefreshTokens).Ignore();
    }
}
