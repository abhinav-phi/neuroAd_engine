# TRIBE v2 Notes

## Summary

TRIBE v2 is a tri-modal model for predicting human brain activity from video, audio, and language inputs.

## Why It Matters Here

This project is using TRIBE v2 as the grounding model for translating ad stimuli into cognitive-response metrics.

## Project-Level Interpretation

Instead of treating attention or memory as arbitrary heuristics, the system should:

1. run text or ad content through TRIBE v2 when available
2. inspect predicted brain-region activation
3. aggregate relevant regions into higher-level cognitive metrics
4. expose those metrics to the environment, grader, and UI

## Operational Constraint

The heavyweight model path will likely require:

- larger downloads
- model cache management
- stronger hardware, ideally GPU

That is why the PDFs recommend a fallback mode with coefficients calibrated offline.

## Gap Noted During Review

`cognitive_ad_testing_plan.pdf` appears image-based and did not yield machine-readable text with the local parser. The scaffold here is based on the other three PDFs, which already gave a consistent architecture.
