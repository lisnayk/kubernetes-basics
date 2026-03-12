const express = require("express");
const { faker } = require("@faker-js/faker");
const swaggerUi = require("swagger-ui-express");
const yaml = require("js-yaml");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const PRODUCTS_API_URL = process.env.PRODUCTS_API_URL || "http://api-products:3002/api/products";
const PRODUCTS_API_KEY = process.env.PRODUCTS_API_KEY || "prod-secret-key";

// OpenAPI setup
const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/api/profile", (req, res) => {
    res.json({
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        company: faker.company.name(),
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(faker.internet.userName())}`,
        timestamp: new Date().toISOString()
    });
});

app.get("/api/products", async (req, res) => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch(PRODUCTS_API_URL, {
            headers: { 'Authorization': `Bearer ${PRODUCTS_API_KEY}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            res.json(data);
        } else {
            res.status(response.status).json({ error: "Failed to fetch products from upstream" });
        }
    } catch (e) {
        console.error("Error fetching products:", e.message);
        res.status(500).json({ error: "Internal Server Error", details: e.message });
    }
});

app.get("/health", (req, res) => {
    res.status(200).send("OK");
});

app.listen(PORT, () => {
    console.log(`Backend API running on port ${PORT}...`);
    console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
});
