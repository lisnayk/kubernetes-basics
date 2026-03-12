const express = require("express");
const { faker } = require("@faker-js/faker");

const app = express();
const PORT = process.env.PORT || 3002;
const API_KEY_PROD = process.env.API_KEY_PROD || "prod-secret-key";
const API_KEY_STAGE = process.env.API_KEY_STAGE || "stage-secret-key";

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const key = authHeader ? authHeader.split(' ')[1] : req.query.api_key;

    if (key === API_KEY_PROD) {
        req.mode = 'production';
        next();
    } else if (key === API_KEY_STAGE) {
        req.mode = 'staging';
        next();
    } else {
        res.status(401).json({ 
            error: "Unauthorized", 
            message: "Invalid API key." 
        });
    }
};

app.get("/api/products", authenticate, (req, res) => {
    const count = req.mode === 'production' ? 10 : 3;
    const products = Array.from({ length: count }, () => ({
        id: faker.string.uuid(),
        name: faker.commerce.productName(),
        price: faker.commerce.price({ min: 10, max: 1000, symbol: '$' }),
        description: faker.commerce.productDescription(),
        category: faker.commerce.department(),
        image: faker.image.url({ width: 640, height: 480 }),
        mode: req.mode
    }));
    
    console.log(`[${new Date().toISOString()}] Served ${count} products in ${req.mode} mode.`);
    res.json({
        mode: req.mode,
        products: products
    });
});

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`Products API running on port ${PORT}...`);
    console.log(`Modes active: production (key: ${API_KEY_PROD}), staging (key: ${API_KEY_STAGE})`);
});
