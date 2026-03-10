const express = require('express');
const app = express();

const PORT = process.env.PORT || 8080;
const APP_COLOR = process.env.APP_COLOR || '#f0f0f0';
const APP_TITLE = process.env.APP_TITLE || 'Environment Variables Viewer';

app.get('/', (req, res) => {
    const envVars = Object.entries(process.env)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, value]) => `<tr><td style="border: 1px solid #ddd; padding: 8px;"><b>${key}</b></td><td style="border: 1px solid #ddd; padding: 8px;">${value}</td></tr>`)
        .join('');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${APP_TITLE}</title>
        <style>
            body { 
                background-color: ${APP_COLOR}; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                margin: 40px;
                color: #333;
            }
            .container {
                background: rgba(255, 255, 255, 0.85);
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            h1 { color: #222; margin-top: 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>${APP_TITLE}</h1>
            <p>Current Page Background (APP_COLOR): <code>${APP_COLOR}</code></p>
            <table>
                <thead>
                    <tr style="background: #eee;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Variable Name</th>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${envVars}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;

    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} with background color ${APP_COLOR}`);
});
