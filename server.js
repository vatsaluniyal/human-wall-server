const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); // Serve the Wall

// --- PRIVATE ACCESS CONFIG ---
const AUTH_TOKEN = "organic-intelligence-2026-secret"; // The "Secret Handshake"

const restrictAccess = (req, res, next) => {
    const token = req.headers['x-human-wall-token'];
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({ error: "UNAUTHORIZED: This server is private." });
    }
    next();
};
// -----------------------------


// Load key or Generate if missing (for Deployment)
let privateKey;
let publicKey;

if (!fs.existsSync('private.pem') || !fs.existsSync('public.pem')) {
    console.log("Keys not found. Generating new RSA Keypair...");
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
    });

    fs.writeFileSync('private.pem', priv.export({ type: 'pkcs1', format: 'pem' }));
    fs.writeFileSync('public.pem', pub.export({ type: 'pkcs1', format: 'pem' }));
    console.log("Keys generated successfully.");
}

try {
    privateKey = fs.readFileSync('private.pem', 'utf8');
    publicKey = fs.readFileSync('public.pem', 'utf8'); // Load public key here too
} catch (e) {
    console.error("Critical Error loading keys:", e);
    process.exit(1);
}

const HUMANITY_THRESHOLD = 0.8;

app.post('/certify', (req, res) => {
    const { content, telemetry, metadata } = req.body;

    console.log(`Received request for content length: ${content ? content.length : 0}`);
    console.log(`Telemetry Score Claim: ${metadata.score}`);

    // Re-verify logic on server side (Mirroring client-side for MVP)
    // In production, we would re-run the raw telemetry through a robust ML model.
    // For now, we trust the score but sign the *data*.

    if (parseFloat(metadata.score) < HUMANITY_THRESHOLD) {
        return res.status(403).json({ error: "Humanity score too low for certification." });
    }

    // Use persistent Human ID (The Digital Soul) if provided, otherwise fallback to Biometric
    let matrixId = telemetry.human_id || "0xUNKNOWN";

    if (matrixId === "0xUNKNOWN") {
        let biometricSeed = "unknown";
        if (telemetry && telemetry.keystrokes && telemetry.keystrokes.length > 0) {
            biometricSeed = telemetry.keystrokes.map(k => k.flightTime).join(",");
        }
        const bioHash = crypto.createHash('sha256').update(biometricSeed).digest('hex').substring(0, 8).toUpperCase();
        matrixId = `0x${bioHash}`;
    }

    // Create the packet to sign
    const certificatePayload = {
        content_hash: crypto.createHash('sha256').update(content).digest('hex'),
        timestamp: Date.now(),
        humanity_score: metadata.score,
        signer_id: matrixId // The "Identity" of the human
    };

    // Sign it
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(certificatePayload));
    sign.end();
    const signature = sign.sign(privateKey, 'hex');

    res.json({
        can_proceed: true,
        certificate: certificatePayload,
        signature: signature
    });
});

// --- NEW: The Wall (Verification Endpoint) ---
let feed = [];

// Load existing posts if they exist
if (fs.existsSync('posts.json')) {
    try {
        feed = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
        console.log(`Loaded ${feed.length} posts from disk.`);
    } catch (e) {
        console.error("Error loading posts.json:", e);
    }
}

const savePosts = () => {
    fs.writeFileSync('posts.json', JSON.stringify(feed, null, 2));
};


// publicKey is already loaded at the top

app.post('/submit-post', restrictAccess, (req, res) => {
    const { content, signature, certificate } = req.body;

    console.log("Verifying post...");

    if (!signature || !certificate) {
        return res.status(401).json({ error: "REJECTED: No Human Signature Found." });
    }

    // 1. Reconstruct the payload that was supposedly signed
    // Note: In a real app, we'd be stricter about exact JSON serialization.
    // Here we rely on the client sending back the *exact* certificate object we gave them.
    const verify = crypto.createVerify('SHA256');
    verify.update(JSON.stringify(certificate));
    verify.end();

    // 2. Verify with Public Key
    const isVerified = verify.verify(publicKey, signature, 'hex');

    if (isVerified) {
        // 3. Double Check: Does the certificate content hash match the actual content submitted?
        // Fix: Trim potential whitespace differences or partial updates
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');

        // Debug
        console.log(`Content Hash (Server): ${contentHash}`);
        console.log(`Content Hash (Cert):   ${certificate.content_hash}`);

        if (contentHash !== certificate.content_hash) {
            return res.status(403).json({
                error: "TAMPER DETECTED: Content changed after signing. Please wait for re-verification (purple border)."
            });
        }

        console.log("Signature Verified! Human Detected.");

        const post = {
            id: feed.length + 1,
            content: content,
            author_id: certificate.signer_id,
            timestamp: new Date().toLocaleTimeString()
        };
        feed.unshift(post);
        savePosts(); // Persist to disk

        return res.json({ success: true, feed: feed });
    } else {
        console.log("Verification Failed! Bot Detected.");
        return res.status(403).json({ error: "REJECTED: Invalid Signature. Are you a bot?" });
    }
});

app.get('/feed', (req, res) => {
    res.json(feed);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Notary Server + Wall running on port ${PORT}`));
