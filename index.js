require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(bodyParser.json());

const {
    GEMINI_API_KEY,
    WHATSAPP_TOKEN,
    PHONE_NUMBER_ID,
    VERIFY_TOKEN
} = process.env;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    try {
        let body = req.body;
        
        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                let msg = body.entry[0].changes[0].value.messages[0];
                let from = msg.from; 
                let msg_body = msg.text.body; 

                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const prompt = `You are a smart customer support AI for "Visual Storyboard Studio", a professional video editing and commercial ad agency. Answer concisely, politely, and creatively. Customer says: ${msg_body}`;
                
                const result = await model.generateContent(prompt);
                const replyText = result.response.text();

                await axios({
                    method: 'POST',
                    url: `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    data: {
                        messaging_product: 'whatsapp',
                        to: from,
                        text: { body: replyText }
                    }
                });
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error:", error);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
