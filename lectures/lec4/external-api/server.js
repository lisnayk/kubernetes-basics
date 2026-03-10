const express = require("express");
const { faker } = require("@faker-js/faker");

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY || "default-secret-key";

// Middleware to check API key
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const key = authHeader ? authHeader.split(' ')[1] : req.query.api_key;

    if (key === API_KEY) {
        next();
    } else {
        res.status(401).json({ 
            error: "Unauthorized", 
            message: "Invalid or missing API key. Use 'Authorization: Bearer <key>' header or 'api_key' query param." 
        });
    }
};

app.get("/api/external/data", authenticate, (req, res) => {
    const data = {
        id: faker.string.uuid(),
        transaction: faker.finance.transactionDescription(),
        amount: faker.finance.amount({ symbol: '$' }),
        account: faker.finance.accountNumber(),
        timestamp: new Date().toISOString(),
        provider: "Mock External Financial API",
        pod: process.env.POD_NAME || "unknown"
    };
    
    console.log(`[${new Date().toISOString()}] Served data to client. Pod: ${process.env.POD_NAME}`);
    res.json(data);
});

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`External API running on port ${PORT}...`);
    console.log(`Required API_KEY: ${API_KEY}`);
});
