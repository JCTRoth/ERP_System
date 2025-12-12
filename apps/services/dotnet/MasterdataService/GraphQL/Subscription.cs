using MasterdataService.Models;

namespace MasterdataService.GraphQL;

public class Subscription
{
    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new customer creation events")]
    public Customer OnCustomerCreated([EventMessage] Customer customer) => customer;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new supplier creation events")]
    public Supplier OnSupplierCreated([EventMessage] Supplier supplier) => supplier;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new employee creation events")]
    public Employee OnEmployeeCreated([EventMessage] Employee employee) => employee;

    [Subscribe]
    [Topic]
    [GraphQLDescription("Subscribe to new asset creation events")]
    public Asset OnAssetCreated([EventMessage] Asset asset) => asset;
}
