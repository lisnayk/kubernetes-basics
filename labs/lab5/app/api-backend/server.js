const express = require('express');
const mysql = require('mysql2/promise');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

const app = express();
const PORT = process.env.PORT || 3000;

const dbConfig = {
    host: process.env.DB_HOST || 'mysql',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'lab5_db'
};

let pool;

async function initDB() {
    try {
        const connection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
        await connection.end();

        pool = await mysql.createPool(dbConfig);
        console.log('Connected to MySQL');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                description TEXT,
                category VARCHAR(100),
                image VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const [rows] = await pool.execute('SELECT COUNT(*) as count FROM products');
        if (rows[0].count === 0) {
            const seedCount = parseInt(process.env.SEED_COUNT) || 10;
            console.log(`Seeding initial data with Faker (${seedCount} records)...`);
            const products = [];
            for (let i = 0; i < seedCount; i++) {
                products.push([
                    faker.commerce.productName(),
                    faker.commerce.price({ min: 10, max: 2000 }),
                    faker.commerce.productDescription(),
                    faker.commerce.department(),
                    faker.image.url({ width: 640, height: 480 })
                ]);
            }
            await pool.query('INSERT INTO products (name, price, description, category, image) VALUES ?', [products]);
            console.log('Seed completed');
        }
    } catch (err) {
        console.error('Database Init Error:', err.message);
        setTimeout(initDB, 5000);
    }
}

initDB();

const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/products', async (req, res) => {
    if (!pool) return res.status(503).json({ error: 'Database not ready' });
    try {
        const [rows] = await pool.execute('SELECT * FROM products');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
