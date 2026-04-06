const express = require('express');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Отримуємо змінні оточення або ставимо значення за замовчуванням
const studentInfo = {
    name: process.env.STUDENT_NAME || "Задайте STUDENT_NAME",
    group: process.env.STUDENT_GROUP || "Задайте STUDENT_GROUP",
    appType: process.env.APP_TYPE || "default",
    hostname: os.hostname(),
    podIP: process.env.POD_IP || "unknown",
    nodeName: process.env.NODE_NAME || "unknown",
    namespace: process.env.NAMESPACE || "default"
};

// Ендпоінт для отримання даних у JSON
app.get('/api/info', (req, res) => {
    res.json(studentInfo);
});

// Роздаємо статичний HTML
app.use(express.static(path.join(__dirname)));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
