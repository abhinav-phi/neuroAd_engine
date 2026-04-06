# 🚀 NeuroAd — Complete Execution & Usage Guide

Welcome to the **NeuroAd** SaaS platform. This guide will take you from a complete beginner to a pro in running, demonstrating, and deploying your cognitive AI ad analysis tool. 

---

## 🛠️ 1. SETUP FROM SCRATCH

If you are setting this up for the first time on your Windows machine, follow these steps to get everything installed.

### Open Two Terminals (Command Prompt / CMD)
You will need two separate terminal windows.

**Terminal 1: Setup Backend**
1. Navigate to your project folder:
   ```cmd
   cd C:\Users\abhin\Desktop\neuroAd_engine\backend
   ```
2. Activate the virtual environment (if not already active):
   ```cmd
   venv\Scripts\activate
   ```
3. Install dependencies (If you haven't yet. This might take a minute):
   ```cmd
   pip install -r requirements.txt
   ```

**Terminal 2: Setup Frontend**
1. Navigate to your frontend folder:
   ```cmd
   cd C:\Users\abhin\Desktop\neuroAd_engine\frontend
   ```
2. Install Node modules:
   ```cmd
   npm install
   ```

---

## ▶️ 2. HOW TO RUN (FINAL WORKING COMMANDS)

Every time you want to run the project, open your two command prompts and execute the following:

### Step 1: Start the Backend (Terminal 1)
```cmd
cd C:\Users\abhin\Desktop\neuroAd_engine
backend\venv\Scripts\python.exe -m uvicorn backend.src.app:app --host 0.0.0.0 --port 7860
```
*Wait until you see:* `Uvicorn running on http://0.0.0.0:7860`

### Step 2: Start the Frontend (Terminal 2)
```cmd
cd C:\Users\abhin\Desktop\neuroAd_engine\frontend
npm run dev
```

### Step 3: Open the Dashboard
Open your web browser (Chrome/Edge) and go to:
👉 **[http://localhost:5174](http://localhost:5174/)** (or `5173` depending on terminal output)

---

## 🔄 3. FULL WORKING FLOW (How It Works)

NeuroAd acts exactly like a premium SaaS product for marketers. 

1. **The Input:** The user lands on the dashboard and is presented with an intuitive Upload interface. They can:
   - Type in an **Ad Copy / Text** 
   - Upload an **Image Ad**
   - Upload a **Video Ad**
2. **The Processing:** The user clicks **Analyze Ad**. The frontend displays a custom glowing "Brain Scanning" animation while it intelligently routes the payload to the matching FastAPI backend endpoint (`/analyze_ad`, `/tribe_predict_image`, or `/analyze-video`).
3. **The Simulation:** The backend engine breaks down the ad, scoring human cognitive load, memory retention, emotional valence, and attention map intensity based on its internal engine (or TRIBE v2).
4. **The Results Output:** The dashboard completely refaces to show:
   - **Engagement Score:** A beautiful circular gauge (e.g. 84% High Performing).
   - **Cognitive Breakdown:** Horizontal progress bars mapping load and emotion.
   - **Segment Table:** A structured breakdown showing exactly which part of the ad (e.g., The Hook) generated the highest attention.
   - **Brain Map:** A glowing visual diagram highlighting the specific neural pathways activated (V1, Amygdala, Prefrontal Cortex).
   - **AI Suggestions:** Auto-generated, actionable advice to fix low-performing areas based on cognitive threshold flags.

---

## 📂 4. DO I NEED TO UPLOAD ANYTHING?

**For Local Testing / Running: NO.**
Everything runs entirely on your local machine using the commands in Section 2. You do **not** need to upload any project code to Github or Hugging Face to test or demo the product locally. 

**For Submission / Backup: YES.**
You should push the code to a GitHub Repository so judges can review your source code and you avoid accidentally losing your progress. 

---

## 🚀 5. DEPLOYMENT (OPTIONAL)

If you want the product continuously live on the internet:

### (A) Uploading Source Code to GitHub
GitHub is essential for hackathon submissions.
1. Open a terminal in `C:\Users\abhin\Desktop\neuroAd_engine`
2. Run standard git commands:
   ```cmd
   git init
   git add .
   git commit -m "Final NeuroAd SaaS Dashboard"
   git push origin main
   ```

### (B) Hosting the Backend (Hugging Face Spaces)
If you want others to ping your API without your computer being turned on:
1. Create a "Space" on Hugging Face using the Docker/Gradio option.
2. Upload the `backend/` folder.
3. Once running, Hugging Face gives you a URL (e.g., `https://abhin-neuroad.hf.space`). You would then copy this link and update `BASE_URL` inside `frontend/src/lib/adApi.ts` before deploying the frontend.

### (C) Hosting the Frontend (Vercel)
If you want to share the URL of your site with judges:
1. Update `BASE_URL` in `adApi.ts` to your active Hugging Face URL.
2. Push your code to GitHub.
3. Log into [Vercel](https://vercel.com/), link your GitHub project, and click "Deploy". Vercel auto-detects Vite and publishes the site live.

*(Note: For the hackathon demo itself, running it **Locally** as described in Section 2 is usually faster, highly stable, and perfectly acceptable!)*

---

## 🎤 6. DEMO GUIDE (HACKATHON READY)

When presenting to judges or recording a demo video, follow this exact script and flow:

1. **Open the browser** smoothly to `http://localhost:5174`.
2. **The Pitch:** *"Welcome to NeuroAd. Typically, marketers spend thousands of dollars to test if an ad works. We built a cognitive AI that simulates human attention, memory, and emotion, giving you predictive ROI before you spend a single dollar."* 
3. **The Action:** Click the "Ad Copy" tab. Click the **"Paste Sample Ad"** button. Point out how easy the user interface is.
4. **The "Wow" Moment:** Click **Analyze Ad**. 
   - *"While analyzing, our system simulates how a human brain processes this information..."* (Let them watch the glowing brain animation).
5. **The Reveal:** As the dashboard loads, scroll smoothly through the metrics.
   - Point to the **Engagement Score** gauge. 
   - Point to the **Brain Map**: *"We can literally visualize what regions of the brain are activating in real-time."*
   - Point to the **Suggestions Panel**: *"Best of all, the AI gives marketers instant, high-impact suggestions to fix failing segments based on raw cognitive thresholds."*

---

## ⚠️ 7. COMMON ERRORS + FIXES

* **"Port 5173 is in use"**: Vite will automatically open on `5174`. Check your terminal output and use `http://localhost:5174` instead.
* **"Analysis Failed (404) Not Found"**: Your backend is not running, or you are running the backend in the wrong directory. Ensure you ran the exact uvicorn command from the root `neuroAd_engine` folder so the path `backend.src.app:app` is resolved correctly.
* **Blank screen on frontend load**: You typed the wrong localhost port. Make sure you match exactly what `npm run dev` outputs.
* **"JSON Decode Error (422)" via API**: This simply means the inputs typed into the web interface had an illegal character preventing text parsing. Use plain text formatting.
