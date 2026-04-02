# Project Context

## What This Project Is

This hackathon project is a cognitive ad testing platform. The system evaluates an advertisement and estimates how people are likely to respond cognitively, especially around attention, memory retention, emotional response, and cognitive load.

## Scientific Core

The PDFs consistently point to Meta's TRIBE v2 as the scientific foundation.

- Input modalities supported by TRIBE v2: text, audio, and video
- Output: predicted brain activity across cortical and subcortical regions
- Intended project use: convert predicted region activations into ad-relevant metrics

## Practical Product Direction

The product should behave like an ad testing site, but the backend scoring logic is grounded in neuroscience-inspired signals rather than only hand-built heuristics.

## Dual-Mode Architecture

The project needs two modes:

1. `TRIBE v2 mode`
   Used when the environment supports the full model.
2. `Parametric mode`
   Used when the deployment is lightweight or CPU-only.

The parametric mode should be calibrated against TRIBE v2 outputs so the fallback still has scientific credibility.

## Cognitive Metrics Mentioned In The PDFs

- attention scores
- memory retention
- cognitive load
- emotional valence
- engagement score
- attention flow

## Suggested Brain Region Mapping

- attention: visual cortex and eye-field related regions such as `V1`, `V2`, `V4`, `PEF`
- memory: hippocampus and temporal regions such as `Hippocampus`, `TE1a`
- cognitive load: prefrontal regions such as `IFSa`, `IFSp`, `IFJa`
- emotional valence: amygdala and TPJ-related regions

## Important Delivery Constraint

The repo should be organized so all members can work in parallel without conflicting over shared interfaces. That means shared contracts and docs should exist from the beginning.
