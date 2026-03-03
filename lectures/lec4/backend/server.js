const express = require("express");
const memjs = require("memjs");
const { faker } = require("@faker-js/faker");

const app = express();
const PORT = 3000;
const MEMCACHED_SERVERS = process.env.MEMCACHED_SERVERS || "memcached-service:11211";

const mc = memjs.Client.create(MEMCACHED_SERVERS);

// Global status variable to simulate unhealthy state
let isHealthy = true;
let isReady = true;

app.get("/api/profile", async (req, res) => {
    const cacheKey = "user-profile";
    const startTime = Date.now();
    
    try {
        const { value } = await mc.get(cacheKey);
        const responseTime = Date.now() - startTime;
        
        if (value) {
            console.log("Serving from cache");
            return res.json({
                source: "cache",
                data: JSON.parse(value.toString()),
                pod: process.env.POD_NAME,
                responseTime: `${responseTime}ms`
            });
        }

        const profile = {
            fullName: faker.person.fullName(),
            email: faker.internet.email(),
            company: faker.company.name(),
            timestamp: new Date().toISOString()
        };

        // Кешуємо на 10 секунд
        await mc.set(cacheKey, JSON.stringify(profile), { expires: 10 });
        
        const totalTime = Date.now() - startTime;
        console.log("Serving from backend");
        res.json({
            source: "backend",
            data: profile,
            pod: process.env.POD_NAME,
            responseTime: `${totalTime}ms`
        });
    } catch (err) {
        console.error("Memcached error:", err);
        res.status(500).json({ error: "Internal Server Error", details: err.message });
    }
});

// Admin endpoints for testing Probes
app.post("/api/admin/kill", (req, res) => {
    isHealthy = false;
    res.json({ message: "Liveness probe will now fail", status: isHealthy });
});

app.post("/api/admin/toggle-ready", (req, res) => {
    isReady = !isReady;
    res.json({ message: `Readiness probe set to ${isReady}`, status: isReady });
});

// Health check endpoint (for Liveness Probe)
app.get("/health", (req, res) => {
    if (!isHealthy) {
        return res.status(500).send("Unhealthy");
    }
    res.status(200).send("OK");
});

// Readiness check endpoint (for Readiness Probe)
app.get("/ready", async (req, res) => {
    if (!isReady) {
        return res.status(503).send("Not Ready: Manually disabled");
    }
    // Simple check if memcached is reachable
    try {
        await mc.stats();
        res.status(200).send("Ready");
    } catch (err) {
        res.status(503).send("Not Ready: Memcached unreachable");
    }
});

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}...`);
});
