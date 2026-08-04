"""Mathematical operation helpers used by the Semble smoke fixture."""


def add(a: int, b: int) -> int:
    """Return the sum of two numbers."""
    return a + b


def subtract(a: int, b: int) -> int:
    """Return the difference between two numbers."""
    return a - b


def multiply(a: int, b: int) -> int:
    """Return the product of two numbers."""
    return a * b


def power(base: int, exponent: int) -> int:
    """Raise a base to the given exponent."""
    return base**exponent
