using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopService.Migrations
{
    /// <inheritdoc />
    public partial class SyncCustomerIdsWithMasterdataService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Update orders to reference the correct customer ID from MasterdataService
            // Before changing customer IDs (to avoid foreign key constraints)
            migrationBuilder.Sql(
                "UPDATE orders SET customer_id = '3fc2f2e9-8548-431f-9f03-9186942bb48f' WHERE customer_id = '7ec7a010-c34d-4eef-877f-410d25c0606d'");
            
            // Delete old customers (not referenced anymore) and insert new ones with correct IDs
            migrationBuilder.Sql(
                "DELETE FROM customers WHERE id = '7ec7a010-c34d-4eef-877f-410d25c0606d' OR id = '8ec7a010-c34d-4eef-877f-410d25c0606d'");
            
            // Insert customer with correct ID from MasterdataService
            migrationBuilder.Sql(
                "INSERT INTO customers (id, user_id, email, first_name, last_name, phone, company, vat_number, type, is_active, accepts_marketing, default_shipping_address, default_shipping_city, default_shipping_postal_code, default_shipping_country, default_billing_address, default_billing_city, default_billing_postal_code, default_billing_country, created_at, updated_at, notes) VALUES ('3fc2f2e9-8548-431f-9f03-9186942bb48f', '3fc2f2e9-8548-431f-9f03-9186942bb48f', 'jonas.roth@mailbase.info', 'Jonas', 'Roth', '+1-555-0101', 'Mailbase.info', 'DE123456789', 'Individual', true, true, '123 Demo Street', 'Demo City', '12345', 'DE', '123 Demo Street', 'Demo City', '12345', 'DE', NOW(), NOW(), NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: Delete the new customer
            migrationBuilder.Sql(
                "DELETE FROM customers WHERE id = '3fc2f2e9-8548-431f-9f03-9186942bb48f'");
            
            // Revert orders to reference the old customer ID
            migrationBuilder.Sql(
                "UPDATE orders SET customer_id = '7ec7a010-c34d-4eef-877f-410d25c0606d' WHERE customer_id = '3fc2f2e9-8548-431f-9f03-9186942bb48f'");
            
            // Restore old customer
            migrationBuilder.Sql(
                "INSERT INTO customers (id, user_id, email, first_name, last_name, phone, company, vat_number, type, is_active, accepts_marketing, default_shipping_address, default_shipping_city, default_shipping_postal_code, default_shipping_country, default_billing_address, default_billing_city, default_billing_postal_code, default_billing_country, created_at, updated_at, notes) VALUES ('7ec7a010-c34d-4eef-877f-410d25c0606d', '7ec7a010-c34d-4eef-877f-410d25c0606d', 'jonas.roth@mailbase.info', 'Jonas', 'Roth', '+1-555-0101', 'Mailbase.info', 'DE123456789', 'Individual', true, true, 'Demo Street 123', 'Demo City', '12345', 'DE', 'Demo Street 123', 'Demo City', '12345', 'DE', NOW(), NOW(), NULL)");
        }
    }
}
