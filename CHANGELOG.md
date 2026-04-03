# Changelog

## 2026-04-03

### Added
- Added root-level `inference.py` runner for judge execution.
- Added `Dockerfile` with optional `tribev2` install path.
- Added `/grade` endpoint to support explicit grading flow.
- Added `/tribe_predict` endpoint with safe parametric fallback.
- Added `simulation_mode` to `EnvState`.
- Added public simulator compute wrappers:
  - `compute_attention`
  - `compute_memory`
  - `compute_cognitive_load`
  - `compute_emotional_valence`
  - `compute_attention_flow`
  - `compute_composite_engagement`
  - `compute_novelty`
- Added `examples/` sample artifacts.

### Changed
- Environment now attempts best-effort TRIBE model loading when `USE_TRIBEV2=true`.
- Simulator attention formula includes a hook-primacy synergy term to improve reorder sensitivity.

### Fixed
- Unified grading logic by exposing environment-level `grade()`.
- Prepared backend contracts required by judge loop (`/reset`, `/step`, `/grade`).
