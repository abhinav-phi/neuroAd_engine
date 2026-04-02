# Member Ownership

## Member A

Primary ownership from the PDFs:

- `src/models.py`
- `src/env.py`
- `src/tasks.py`
- `src/app.py`
- `openenv.yaml`

Responsibility:

- define shared models
- implement environment lifecycle
- expose API endpoints
- define task configurations

## Member B

Primary ownership from the PDFs:

- `src/simulator.py`
- `src/tribe_bridge.py`
- `src/reward.py`
- `src/grader.py`
- `calibration/`
- `tests/test_simulator.py`
- `tests/test_grader.py`

Responsibility:

- integrate TRIBE v2
- map brain outputs to cognitive metrics
- maintain parametric fallback
- calibrate formulas against TRIBE v2

## Member C

Not fully specified in the extracted text, but the repo needs a clean place for product-facing work:

- `frontend/`
- UI integration with the API
- ad input, preview, and result visualization

## Shared Working Rules

- Keep shared schemas stable once other members start integrating.
- Use `docs/` for decisions that affect more than one member.
- Avoid editing another member's owned files without coordination.
- Put experimental notebooks or one-off analysis outside `src/`.
