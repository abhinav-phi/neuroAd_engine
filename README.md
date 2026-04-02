# neuroAd_engine

Hackathon project for cognitive ad testing using Meta's TRIBE v2 as the scientific grounding for simulated ad-response metrics.

## Goal

Build an ad testing site where advertisement text can be evaluated for likely cognitive response:

- attention
- memory retention
- cognitive load
- emotional valence
- engagement

The system supports two operating modes:

1. `TRIBE v2 mode`
   Uses the `facebook/tribev2` model from Hugging Face to predict brain-region activity and map it to ad metrics.
2. `Parametric fallback mode`
   Uses lightweight formulas calibrated against TRIBE v2 outputs so the project can still run on CPU or in constrained demos.

## Repository Layout

```text
docs/           Project context, architecture notes, and member ownership
src/            Shared backend source for environment, simulator, reward, and API
tests/          Shared test suite
calibration/    Offline calibration scripts and notes for TRIBE v2 alignment
frontend/       Placeholder for the ad testing web UI
scripts/        Utility scripts for setup and local workflows
data/           Example inputs or local-only assets
```

## Team Structure

- Member A: environment architect and API foundation
- Member B: simulator, TRIBE v2 bridge, and reward integration
- Member C: frontend / agent / product-facing flow

Detailed ownership is documented in [`docs/member-ownership.md`](C:\Users\prabhat\OneDrive\Desktop\codingbase\OPEN SOURCE\NeuroAd\docs\member-ownership.md).

## Immediate Build Order

1. Define shared Pydantic models in `src/models.py`
2. Implement simulator interfaces and TRIBE v2 bridge
3. Implement environment state and step logic
4. Expose API endpoints in `src/app.py`
5. Connect the frontend to the API
6. Calibrate fallback formulas against TRIBE v2 outputs

## Notes From The PDFs

- TRIBE v2 is the scientific anchor, not just a branding choice.
- The live demo should remain lightweight, so dual-mode support is important.
- Member B owns the core bridge between raw brain activation outputs and ad metrics.
- The shared repo structure should keep member ownership clear while preserving common contracts.
