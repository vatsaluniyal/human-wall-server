# The Human Wall 🟢

> *Only cryptographically signed human thoughts allowed.*

**The Human Wall** is a proof-of-concept social network that rejects AI-generated content. It uses **Keystroke Biometrics** (flight time, dwell time, entropy) to generate a unique "Digital Identity" and cryptographically signs your posts if you are verified as human.

![Matrix Aesthetic](https://media.giphy.com/media/U3qYN8S0j3bpK/giphy.gif)

## The Concept
The internet is flooding with AI slop. We needed a way to verify **Organic Intelligence**.
This project consists of two parts:
1.  **The Observer (Browser Extension):** Watches *how* you type, not just *what* you type. It generates a "Humanity Score" and requests a cryptographic signature.
2.  **The Wall (Server + UI):** A Matrix-themed feed that verifies signatures on the blockchain (simulated) and rejects anything that wasn't physically typed by a human.

##  Features
-   **Biometric Identity:** Your "User ID" (`0xA3F...`) is generated from your unique typing rhythm.
-   **Matrix Digital Rain:** Full-screen HTML5 Canvas background.
-   **Cyberpunk Audio Engine:** Generative "Dark Drone" and "Digital Water" soundscapes (Web Audio API).
-   **Tron Aesthetic:** Neon Cyan styling for verified human entities.
-   **Bot Blocking:** Copy-pasting from ChatGPT is instantly rejected.

## Installation

### 1. The Server (The Wall)
This repo contains the backend and the frontend.
You can deploy it to **Render.com** or run it locally.

```bash
# Install dependencies
npm install

# Run the server (Generates keys automatically)
node server.js
```
*Live Demo URL:* `https://human-wall-server-1.onrender.com` (Example)

### 2. The Extension (The Key)
You need the Companion Extension to post.
1.  Navigate to `humanity-check-extension` folder.
2.  Open Chrome/Edge -> `chrome://extensions`.
3.  Enable **Developer Mode**.
4.  Click **Load Unpacked** and select the folder.
5.  Go to the URL and start typing.

## License
Unlicense (Public Domain). Code is Law.
