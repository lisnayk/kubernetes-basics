const express = require('express');
const { KubeConfig, CoreV1Api, Log } = require('@kubernetes/client-node');

const app = express();
const port = process.env.PORT || 3000;
const studentInfo = {
    name: process.env.STUDENT_NAME || 'Unknown Student',
    group: process.env.STUDENT_GROUP || 'Unknown Group'
};

// Initialize Kubernetes client
const kc = new KubeConfig();
kc.loadFromDefault(); // In-cluster config if running in pod
const k8sApi = kc.makeApiClient(CoreV1Api);
const k8sLog = new Log(kc);

// Middleware for logging every request
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// API: Get all namespaces
app.get('/api/namespaces', async (req, res) => {
    try {
        const response = await k8sApi.listNamespace();
        const namespaces = response.body.items.map(ns => ns.metadata.name);
        res.json({ namespaces });
    } catch (err) {
        console.error('Error fetching namespaces:', err.response ? err.response.body : err.message);
        res.status(500).json({
            error: 'Failed to fetch namespaces',
            details: err.response ? err.response.body.message : err.message
        });
    }
});

// API: Get pods in a specific namespace
app.get('/api/pods/:namespace', async (req, res) => {
    try {
        const { namespace } = req.params;
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
        console.error(`Error fetching pods from ${req.params.namespace}:`, err.response ? err.response.body : err.message);
        res.status(500).json({
            error: 'Failed to fetch pods',
            details: err.response ? err.response.body.message : err.message
        });
    }
});

// API: Get pod logs
app.get('/api/pods/:namespace/:podName/logs', async (req, res) => {
    try {
        const { namespace, podName } = req.params;
        // For simplicity, we get logs from the first container
        const podResponse = await k8sApi.readNamespacedPod(podName, namespace);
        const containerName = podResponse.body.spec.containers[0].name;

        // Using readNamespacedPodLog directly for simplicity and reliability in one-time fetch
        const logResponse = await k8sApi.readNamespacedPodLog(podName, namespace, containerName, undefined, undefined, undefined, undefined, undefined, 100);
        
        res.json({ logs: logResponse.body });
    } catch (err) {
        console.error(`Error fetching logs for ${req.params.podName}:`, err.response ? err.response.body : err.message);
        res.status(500).json({
            error: 'Failed to fetch logs',
            details: err.response ? err.response.body.message : err.message
        });
    }
});

// API: Get status and student info
app.get('/api/status', (req, res) => {
    res.json({
        status: 'OK',
        student: studentInfo
    });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>K8s Monitor Pro</title>
            <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-gray-100 font-sans leading-normal tracking-normal">
            <div id="app" class="container mx-auto p-4">
                <header class="mb-8 flex justify-between items-center">
                    <div>
                        <h1 class="text-3xl font-bold text-gray-800">Kubernetes Monitor Pro</h1>
                        <p class="text-gray-600">Lab 7: API, RBAC, Vue & Tailwind</p>
                    </div>
                    <div class="text-right bg-white p-3 rounded shadow-sm border-r-4 border-blue-500">
                        <div class="font-bold text-gray-800">{{ student.name }}</div>
                        <div class="text-sm text-gray-600">Group: {{ student.group }}</div>
                    </div>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <!-- Namespace Sidebar -->
                    <div class="md:col-span-1 bg-white p-4 rounded shadow">
                        <h2 class="text-xl font-semibold mb-4 border-b pb-2">Namespaces</h2>
                        <ul class="space-y-2">
                            <li v-for="ns in namespaces" :key="ns">
                                <button 
                                    @click="selectNamespace(ns)"
                                    :class="['w-full text-left px-3 py-2 rounded transition', 
                                             selectedNamespace === ns ? 'bg-blue-500 text-white' : 'hover:bg-blue-100']"
                                >
                                    {{ ns }}
                                </button>
                            </li>
                        </ul>
                    </div>

                    <!-- Pods Content -->
                    <div class="md:col-span-3">
                        <div v-if="loading" class="text-center py-10">
                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            <p class="mt-2 text-gray-600">Loading data...</p>
                        </div>

                        <div v-else-if="selectedNamespace">
                            <h2 class="text-2xl font-semibold mb-4 text-gray-700">Pods in {{ selectedNamespace }}</h2>
                            
                            <div v-if="pods.length === 0" class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
                                No pods found in this namespace.
                            </div>

                            <div class="grid grid-cols-1 gap-4">
                                <div v-for="pod in pods" :key="pod.name" class="bg-white p-4 rounded shadow border-l-4" :class="statusColor(pod.status)">
                                    <div class="flex justify-between items-center">
                                        <div>
                                            <h3 class="font-bold text-lg text-gray-800">{{ pod.name }}</h3>
                                            <p class="text-sm text-gray-600">IP: {{ pod.ip }} | Node: {{ pod.node }}</p>
                                        </div>
                                        <div class="flex space-x-2">
                                            <span class="px-2 py-1 rounded text-xs font-semibold uppercase" :class="statusBadgeColor(pod.status)">
                                                {{ pod.status }}
                                            </span>
                                            <button 
                                                @click="viewLogs(pod.name)"
                                                class="bg-gray-800 hover:bg-black text-white px-3 py-1 rounded text-sm transition"
                                            >
                                                Logs
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-else class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4">
                            Please select a namespace from the sidebar to view pods.
                        </div>
                    </div>
                </div>

                <!-- Logs Modal -->
                <div v-if="logModalPod" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
                    <div class="relative p-5 border w-3/4 shadow-lg rounded-md bg-white">
                        <div class="mt-3">
                            <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Logs for {{ logModalPod }}</h3>
                            <div class="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-x-auto max-h-96 whitespace-pre-wrap">
                                <div v-if="logsLoading">Fetching logs...</div>
                                <div v-else>{{ podLogs || 'No logs found or empty output.' }}</div>
                            </div>
                            <div class="mt-4 text-right">
                                <button 
                                    @click="closeLogs"
                                    class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Error Toast -->
                <div v-if="error" class="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded shadow-lg">
                    {{ error }}
                    <button @click="error = null" class="ml-4 font-bold">&times;</button>
                </div>
            </div>

            <script>
                const { createApp, ref, onMounted } = Vue;

                createApp({
                    setup() {
                        const student = ref({ name: 'Loading...', group: '...' });
                        const namespaces = ref([]);
                        const selectedNamespace = ref('');
                        const pods = ref([]);
                        const loading = ref(false);
                        const error = ref(null);
                        
                        const logModalPod = ref(null);
                        const podLogs = ref('');
                        const logsLoading = ref(false);

                        const fetchNamespaces = async () => {
                            // Fetch student info
                            try {
                                const res = await fetch('/api/status');
                                const data = await res.json();
                                student.value = data.student;
                            } catch (e) { console.error(e); }

                            try {
                                const response = await fetch('/api/namespaces');
                                const data = await response.json();
                                if (data.error) throw new Error(data.details || data.error);
                                namespaces.value = data.namespaces;
                                // Select default if available
                                if (namespaces.value.includes('lab7')) {
                                    selectNamespace('lab7');
                                } else if (namespaces.value.length > 0) {
                                    selectNamespace(namespaces.value[0]);
                                }
                            } catch (err) {
                                error.value = "Failed to load namespaces: " + err.message;
                            }
                        };

                        const selectNamespace = async (ns) => {
                            selectedNamespace.value = ns;
                            loading.value = true;
                            error.value = null;
                            try {
                                const response = await fetch(\`/api/pods/\${ns}\`);
                                const data = await response.json();
                                if (data.error) throw new Error(data.details || data.error);
                                pods.value = data.pods;
                            } catch (err) {
                                error.value = "Failed to load pods: " + err.message;
                                pods.value = [];
                            } finally {
                                loading.value = false;
                            }
                        };

                        const viewLogs = async (podName) => {
                            logModalPod.value = podName;
                            logsLoading.value = true;
                            podLogs.value = '';
                            try {
                                const response = await fetch(\`/api/pods/\${selectedNamespace.value}/\${podName}/logs\`);
                                const data = await response.json();
                                if (data.error) throw new Error(data.details || data.error);
                                podLogs.value = data.logs;
                            } catch (err) {
                                error.value = "Failed to load logs: " + err.message;
                            } finally {
                                logsLoading.value = false;
                            }
                        };

                        const closeLogs = () => {
                            logModalPod.value = null;
                            podLogs.value = '';
                        };

                        const statusColor = (status) => {
                            switch (status) {
                                case 'Running': return 'border-green-500';
                                case 'Pending': return 'border-yellow-500';
                                case 'Failed': return 'border-red-500';
                                default: return 'border-gray-500';
                            }
                        };

                        const statusBadgeColor = (status) => {
                            switch (status) {
                                case 'Running': return 'bg-green-100 text-green-800';
                                case 'Pending': return 'bg-yellow-100 text-yellow-800';
                                case 'Failed': return 'bg-red-100 text-red-800';
                                default: return 'bg-gray-100 text-gray-800';
                            }
                        };

                        onMounted(fetchNamespaces);

                        return {
                            student, namespaces, selectedNamespace, pods, loading, error,
                            logModalPod, podLogs, logsLoading,
                            selectNamespace, viewLogs, closeLogs, statusColor, statusBadgeColor
                        };
                    }
                }).mount('#app');
            </script>
        </body>
        </html>
    `);
});

app.listen(port, () => {
    console.log(`K8s Monitor app listening at http://localhost:${port}`);
});
