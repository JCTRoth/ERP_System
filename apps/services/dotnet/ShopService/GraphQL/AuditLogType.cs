using ShopService.Models;
using HotChocolate.Types;

namespace ShopService.GraphQL;

public class AuditLogType : ObjectType<AuditLog>
{
    protected override void Configure(IObjectTypeDescriptor<AuditLog> descriptor)
    {
        descriptor.Field(a => a.Id).Type<NonNullType<IdType>>();
        descriptor.Field(a => a.EntityId).Type<NonNullType<IdType>>();
        descriptor.Field(a => a.EntityType).Type<NonNullType<StringType>>();
        descriptor.Field(a => a.Action).Type<NonNullType<StringType>>();
        descriptor.Field(a => a.UserId).Type<NonNullType<IdType>>();
        descriptor.Field(a => a.UserEmail).Type<StringType>();
        descriptor.Field(a => a.UserName).Type<StringType>();
        descriptor.Field(a => a.Timestamp).Type<NonNullType<DateTimeType>>();
        descriptor.Field(a => a.OldValues).Type<StringType>();
        descriptor.Field(a => a.NewValues).Type<StringType>();
        descriptor.Field(a => a.Description).Type<StringType>();
        descriptor.Field(a => a.IpAddress).Type<StringType>();
    }
}
