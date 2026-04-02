# Calibration

Use this folder for offline scripts and notes that align the lightweight formulas with TRIBE v2 outputs.

Suggested contents:

- `calibrate.py` generates versioned JSON coefficients
- `coefficients.v1.json` is the default fallback artifact loaded at runtime
- region-to-metric mapping experiments
- benchmark notes comparing TRIBE v2 and parametric mode

Generate a new artifact:

```powershell
python calibration/calibrate.py --output calibration/coefficients.v1.json
```
