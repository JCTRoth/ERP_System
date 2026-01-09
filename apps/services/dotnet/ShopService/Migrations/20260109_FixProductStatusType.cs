using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShopService.Migrations
{
    /// <inheritdoc />
    public partial class FixProductStatusType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Change status column from text to integer to match ProductStatus enum
            migrationBuilder.AlterColumn<int>(
                name: "status",
                table: "products",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert status column back to text
            migrationBuilder.AlterColumn<string>(
                name: "status",
                table: "products",
                type: "text",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");
        }
    }
}