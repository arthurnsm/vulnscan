"""
Módulo de compatibilidade: reexporta run_fuzzing / run_ffuf a partir de ffuf.py
"""
try:
    from .ffuf import run_ffuf, run_fuzzing
except (ImportError, ValueError):
    from ffuf import run_ffuf, run_fuzzing

__all__ = ["run_ffuf", "run_fuzzing"]
