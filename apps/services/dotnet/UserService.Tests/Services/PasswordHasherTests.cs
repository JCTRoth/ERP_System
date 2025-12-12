using FluentAssertions;
using UserService.Services;
using Xunit;

namespace UserService.Tests.Services;

public class PasswordHasherTests
{
    [Fact]
    public void HashPassword_ReturnsNonEmptyHash()
    {
        // Arrange
        var password = "TestPassword123!";

        // Act
        var hash = PasswordHasher.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
        hash.Should().NotBe(password);
    }

    [Fact]
    public void HashPassword_ReturnsDifferentHashesForSamePassword()
    {
        // Arrange
        var password = "TestPassword123!";

        // Act
        var hash1 = PasswordHasher.HashPassword(password);
        var hash2 = PasswordHasher.HashPassword(password);

        // Assert
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void VerifyPassword_ReturnsTrue_ForCorrectPassword()
    {
        // Arrange
        var password = "TestPassword123!";
        var hash = PasswordHasher.HashPassword(password);

        // Act
        var result = PasswordHasher.VerifyPassword(password, hash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_ReturnsFalse_ForIncorrectPassword()
    {
        // Arrange
        var password = "TestPassword123!";
        var wrongPassword = "WrongPassword123!";
        var hash = PasswordHasher.HashPassword(password);

        // Act
        var result = PasswordHasher.VerifyPassword(wrongPassword, hash);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("short")]
    [InlineData("nouppercase123!")]
    [InlineData("NOLOWERCASE123!")]
    [InlineData("NoNumbers!")]
    public void ValidatePasswordStrength_ReturnsFalse_ForWeakPasswords(string password)
    {
        // Act
        var result = PasswordHasher.ValidatePasswordStrength(password);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("StrongP@ss123")]
    [InlineData("MySecure#Password1")]
    [InlineData("Test123!@#")]
    public void ValidatePasswordStrength_ReturnsTrue_ForStrongPasswords(string password)
    {
        // Act
        var result = PasswordHasher.ValidatePasswordStrength(password);

        // Assert
        result.Should().BeTrue();
    }
}
