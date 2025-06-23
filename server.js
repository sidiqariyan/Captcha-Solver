// server.js - Main server file
const express = require('express');
const axios = require('axios');
const path = require('path');
const bodyParser = require('body-parser');
const app = express();
const PORT = 44;

// Middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// reCAPTCHA configuration
const RECAPTCHA_CONFIG = {
    v3: {
        siteKey: '6LducGorAAAAAE3AKYnFanMGEqlIXu73jc6GS6Vw',
        secretKey: '6LducGorAAAAAGe2VzFK_g4BU8ABSwmtUhWkOPGg'
    },
    v2: {
        siteKey: '6LflcWorAAAAAHYJ1M1MkOgKP7-n5UtGg6wM9GML',
        secretKey: '6LflcWorAAAAAH6WETcpjO1srxgSAOXk9ZfKjjiP'
    }
};

// Routes
app.get('/', (req, res) => {
    res.render('index', { 
        recaptchaV2SiteKey: RECAPTCHA_CONFIG.v2.siteKey,
        recaptchaV3SiteKey: RECAPTCHA_CONFIG.v3.siteKey
    });
});

// reCAPTCHA v2 verification endpoint
app.post('/verify-v2', async (req, res) => {
    const { 'g-recaptcha-response': recaptchaResponse } = req.body;
    
    if (!recaptchaResponse) {
        return res.json({ 
            success: false, 
            error: 'No reCAPTCHA response provided' 
        });
    }

    try {
        const verificationResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: RECAPTCHA_CONFIG.v2.secretKey,
                    response: recaptchaResponse,
                    remoteip: req.ip
                }
            }
        );

        const { success, score, action, challenge_ts, hostname, 'error-codes': errorCodes } = verificationResponse.data;

        res.json({
            success,
            score,
            action,
            challenge_ts,
            hostname,
            errorCodes,
            details: {
                message: success ? 'reCAPTCHA v2 verification successful!' : 'reCAPTCHA v2 verification failed',
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ip: req.ip
            }
        });
    } catch (error) {
        console.error('reCAPTCHA v2 verification error:', error);
        res.json({ 
            success: false, 
            error: 'Verification request failed' 
        });
    }
});

// reCAPTCHA v3 verification endpoint
app.post('/verify-v3', async (req, res) => {
    const { token, action } = req.body;
    
    if (!token) {
        return res.json({ 
            success: false, 
            error: 'No reCAPTCHA token provided' 
        });
    }

    try {
        const verificationResponse = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: RECAPTCHA_CONFIG.v3.secretKey,
                    response: token,
                    remoteip: req.ip
                }
            }
        );

        const { success, score, action: returnedAction, challenge_ts, hostname, 'error-codes': errorCodes } = verificationResponse.data;

        // v3 specific logic - check score threshold
        const scoreThreshold = 0.5;
        const isValidScore = score >= scoreThreshold;
        const isValidAction = returnedAction === action;

        res.json({
            success: success && isValidScore && isValidAction,
            score,
            action: returnedAction,
            challenge_ts,
            hostname,
            errorCodes,
            details: {
                message: success ? 
                    `reCAPTCHA v3 verification successful! Score: ${score}` : 
                    'reCAPTCHA v3 verification failed',
                scoreThreshold,
                isValidScore,
                isValidAction,
                timestamp: new Date().toISOString(),
                userAgent: req.get('User-Agent'),
                ip: req.ip
            }
        });
    } catch (error) {
        console.error('reCAPTCHA v3 verification error:', error);
        res.json({ 
            success: false, 
            error: 'Verification request failed' 
        });
    }
});

// Educational endpoint to show how reCAPTCHA works
app.get('/how-it-works', (req, res) => {
    res.render('how-it-works');
});

// API endpoint to demonstrate reCAPTCHA analytics
app.get('/api/analytics', (req, res) => {
    res.json({
        explanation: {
            v2: {
                description: "reCAPTCHA v2 requires user interaction",
                workflow: [
                    "1. User loads page with reCAPTCHA widget",
                    "2. User clicks 'I'm not a robot' checkbox",
                    "3. Google analyzes user behavior patterns",
                    "4. If suspicious, shows image challenge",
                    "5. User solves challenge if presented",
                    "6. Token is generated and sent to server",
                    "7. Server verifies token with Google API"
                ],
                securityFeatures: [
                    "Mouse movement analysis",
                    "Typing patterns",
                    "Browser fingerprinting",
                    "IP reputation",
                    "Previous interaction history"
                ]
            },
            v3: {
                description: "reCAPTCHA v3 runs invisibly and returns a score",
                workflow: [
                    "1. JavaScript executes on page load",
                    "2. Google analyzes user behavior continuously",
                    "3. Score (0.0-1.0) is generated based on analysis",
                    "4. Token with score is sent to server",
                    "5. Server decides action based on score threshold",
                    "6. Optional: Trigger additional verification if needed"
                ],
                scoreInterpretation: {
                    "0.9-1.0": "Very likely human",
                    "0.7-0.8": "Likely human",
                    "0.5-0.6": "Neutral/Unclear",
                    "0.3-0.4": "Likely bot",
                    "0.0-0.2": "Very likely bot"
                }
            }
        },
        bestPractices: [
            "Always verify tokens on server side",
            "Never trust client-side validation alone",
            "Set appropriate score thresholds for v3",
            "Monitor and adjust thresholds based on data",
            "Implement fallback mechanisms",
            "Log attempts for analysis"
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Educational reCAPTCHA Demo');
    console.log('reCAPTCHA v2 keys are now configured and ready to use');
});

// package.json dependencies needed:
/*
{
  "name": "recaptcha-educational-demo",
  "version": "1.0.0",
  "description": "Educational demonstration of reCAPTCHA v2 and v3",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ejs": "^3.1.9",
    "axios": "^1.6.0",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
*/