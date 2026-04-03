# Frontend

React + Vite UI for the NeuroAd cognitive optimization environment.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Backend Connection

Set API base URL before starting frontend:

```bash
set REACT_APP_API_URL=http://127.0.0.1:7860
```

If `REACT_APP_API_URL` is not set, the UI uses local mock data mode.

## Expected Backend Endpoints

- `GET /health`
- `POST /reset`
- `POST /step`
- `POST /grade`
- `GET /state`

## Notes

- Frontend API adapter maps UI-friendly contracts to backend action/task formats.
- Drag reorder, action panel, reward strip, and grading modal are wired to backend responses.