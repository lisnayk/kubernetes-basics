const express = require('express');
const { KubeConfig, CoreV1Api } = require('@kubernetes/client-node');

const app = express();
const port = process.env.PORT || 3000;

// Initialize Kubernetes client
const kc = new KubeConfig();
kc.loadFromDefault(); // In-cluster config if running in pod
const k8sApi = kc.makeApiClient(CoreV1Api);

app.get('/api/pods', async (req, res) => {
    try {
        const namespace = process.env.NAMESPACE || 'lab7';
        console.log(`Fetching pods from namespace: ${namespace}`);
        
        const response = await k8sApi.listNamespacedPod(namespace);
        const pods = response.body.items.map(pod => ({
            name: pod.metadata.name,
            status: pod.status.phase,
            ip: pod.status.podIP,
            startTime: pod.status.startTime,
            node: pod.spec.nodeName
        }));

        res.json({
            namespace,
            podCount: pods.length,
            pods
        });
    } catch (err) {
        console.error('Error fetching pods:', err.response ? err.response.body : err.message);
        res.status(500).json({
            error: 'Failed to fetch pods from Kubernetes API',
            details: err.response ? err.response.body.message : err.message
        });
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head><title>K8s Monitor</title></head>
            <body style="font-family: sans-serif; padding: 20px;">
                <h1>Kubernetes Pod Monitor (Lab 7)</h1>
                <div id="status">Loading pods...</div>
                <ul id="pod-list"></ul>
                <script>
                    fetch('/api/pods')
                        .then(r => r.json())
                        .then(data => {
                            const status = document.getElementById('status');
                            const list = document.getElementById('pod-list');
                            if (data.error) {
                                status.innerText = 'Error: ' + data.details;
                                return;
                            }
                            status.innerText = 'Found ' + data.podCount + ' pods in namespace "' + data.namespace + '":';
                            data.pods.forEach(pod => {
                                const li = document.createElement('li');
                                li.innerHTML = '<b>' + pod.name + '</b> [' + pod.status + '] - IP: ' + pod.ip + ' (Node: ' + pod.node + ')';
                                list.appendChild(li);
                            });
                        })
                        .catch(err => {
                            document.getElementById('status').innerText = 'Fetch error: ' + err.message;
                        });
                </script>
            </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`K8s Monitor app listening at http://localhost:${port}`);
});
