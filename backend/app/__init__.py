"""GeoLens AI Application Package"""
import sys
import types

# Compatibility shim: when deployed with Render Root Directory = 'backend',
# the root package is 'app' rather than 'backend.app'.
# This allows all existing 'from backend.app...' imports to resolve seamlessly.
if "backend" not in sys.modules:
    try:
        import backend  # noqa: F401
    except ImportError:
        import app
        _backend = types.ModuleType("backend")
        _backend.app = app
        sys.modules["backend"] = _backend
        sys.modules["backend.app"] = app
