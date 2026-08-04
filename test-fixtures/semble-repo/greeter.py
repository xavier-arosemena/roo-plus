"""Friendly greeting helpers used by the Semble smoke fixture."""


def greet(name: str) -> str:
    """Return a hello message for the given name."""
    return f"Hello, {name}!"


def farewell(name: str) -> str:
    """Return a goodbye message for the given name."""
    return f"Goodbye, {name}!"
