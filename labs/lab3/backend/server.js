const express = require("express");
const { faker } = require("@faker-js/faker");
const os = require("os");

const app = express();
const PORT = 3000;

app.get("/api/profile", (req, res) => {
    res.json({
        student: {
            name: process.env.STUDENT_NAME,
            group: process.env.GROUP,
            variant: process.env.VARIANT
        },
        deployment: {
            version: process.env.VERSION,
            backendPod: process.env.POD_NAME,
            namespace: process.env.POD_NAMESPACE,
            node: process.env.NODE_NAME,
            podIP: process.env.POD_IP
        },
        fakeUser: {
            fullName: faker.person.fullName(),
            email: faker.internet.email(),
            company: faker.company.name()
        },
        metrics: {
            uptime: process.uptime(),
            memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024)
        }
    });
});

app.listen(PORT, () => {
    console.log("Backend running...");
});