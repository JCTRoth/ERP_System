using HotChocolate.Types;
using UserService.DTOs;

namespace UserService.GraphQL;

public class UserDtoType : ObjectType<UserDto>
{
    protected override void Configure(IObjectTypeDescriptor<UserDto> descriptor)
    {
        // Don't specify name - let it default to "UserDto"

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

        descriptor.Field(u => u.Role)
            .Type<NonNullType<StringType>>();

        descriptor.Field(u => u.PreferredLanguage)
            .Type<StringType>();

        descriptor.Field(u => u.CreatedAt)
            .Type<NonNullType<DateTimeType>>();

        descriptor.Field(u => u.LastLoginAt)
            .Type<DateTimeType>();
    }
}