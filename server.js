const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

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

    // Generate Biometric ID from typing pattern (First 10 keystrokes flight times)
    // This creates a pseudo-unique ID based on *how* they typed.
    let biometricSeed = "unknown";
    if (telemetry && telemetry.keystrokes && telemetry.keystrokes.length > 0) {
        biometricSeed = telemetry.keystrokes.map(k => k.flightTime).join(",");
    }
    const bioHash = crypto.createHash('sha256').update(biometricSeed).digest('hex').substring(0, 8).toUpperCase();
    const matrixId = `0x${bioHash}`; // e.g. 0xA3F192B4

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
const feed = []; // In-memory verification feed

const feed = []; // In-memory verification feed

// publicKey is already loaded at the top

app.post('/submit-post', (req, res) => {
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
