# neuroAd_engine

Hackathon project for cognitive ad testing using neuroscience-grounded signals.

## What It Does

The backend simulates ad-response metrics for:

- attention
- memory retention
- cognitive load
- emotional valence
- engagement

It supports dual mode execution:

1. TRIBE-like mode when model + adapter are available
2. Parametric calibrated fallback mode for lightweight CPU demos

## API Flow

Primary judge flow:

1. `POST /reset`
2. `POST /step` (multiple times)
3. `POST /grade`

Other utility endpoints:

- `GET /health`
- `GET /state`
- `POST /tribe_predict`

## Quick Start (Backend)

```bash
python -m pip install -r requirements.txt
uvicorn src.app:app --host 0.0.0.0 --port 7860
```

Optional TRIBE dependency:

```bash
pip install git+https://github.com/facebookresearch/tribev2.git
```

Then enable it:

```bash
set USE_TRIBEV2=true
```

## Run Judge Runner

`inference.py` executes easy/medium/hard tasks through `/reset -> /step -> /grade`.

```bash
python inference.py
```

Optional env vars:

- `NEUROAD_API_URL` (default: `http://127.0.0.1:7860`)
- `OPENAI_API_KEY` and `OPENAI_MODEL` for LLM-guided action planning

## Frontend

```bash
cd frontend
npm install
npm run dev
```

To hit real backend, set `REACT_APP_API_URL` before running frontend.

## Docker

```bash
docker build -t neuroad .
docker run -p 7860:7860 neuroad
```

Optional TRIBE install at build time:

```bash
docker build --build-arg INSTALL_TRIBEV2=true -t neuroad-tribe .
```

## Repository Layout

```text
docs/           Context + ownership notes
src/            Backend models, env, simulator, reward, grader, API
tests/          Python tests
calibration/    Coefficients + calibration tooling
frontend/       React/Vite UI
examples/       Example run artifacts
scripts/        Utility scripts
data/           Local assets / placeholder data
```

## Team Ownership

- Member A: environment architect + API foundation
- Member B: simulator + reward + grading + bridge
- Member C: product flow + deployment + runner artifacts

See [docs/member-ownership.md](docs/member-ownership.md) for details.
