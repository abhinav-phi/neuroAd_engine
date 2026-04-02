# Frontend

Simple no-build viewer to test `reset`, `step`, and `state` quickly.

## Files

- `index.html`
- `styles.css`
- `app.js`

## Run

1. Start backend:

```powershell
uvicorn src.app:app --reload
```

2. Serve frontend folder (new terminal):

```powershell
python -m http.server 5500 --directory frontend
```

3. Open:

`http://127.0.0.1:5500`

4. Keep API Base URL as `http://127.0.0.1:8000` unless your backend is on another port.
