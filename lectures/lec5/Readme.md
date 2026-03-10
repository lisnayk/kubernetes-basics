# Лекція №5. ConfigMaps та Secrets

## Що таке ConfigMap та Secret?

У Kubernetes важливо відокремлювати конфігурацію додатка від його образу. Це дозволяє використовувати один і той самий образ (наприклад, `backend:v1`) для різних середовищ (dev, test, prod) без його перезбірки.

### ConfigMap
**ConfigMap** — це об'єкт API, що використовується для зберігання неконфіденційних даних у парах ключ-значення. 
Використовується для:
- Змінних оточення (Environment Variables).
- Файлів конфігурації (наприклад, `nginx.conf` або `app.properties`).
- Аргументів командного рядка.

### Secret
**Secret** — схожий на ConfigMap, але призначений для зберігання конфіденційної інформації:
- Паролі.
- Токени API.
- SSH-ключі.
- Сертифікати SSL.

**Важливо:** За замовчуванням дані у Secret зберігаються у форматі **base64**, що НЕ є шифруванням. Це лише кодування, щоб уникнути проблем із символами. У реальних кластерах для шифрування використовують механізми (Encryption at Rest) або зовнішні системи (Vault).

---

## Як передати дані в Pod?

Існує три основні способи:

### 1. Змінні оточення (Environment Variables)

Найпростіший спосіб передати окремі значення.

```yaml
env:
  - name: APP_COLOR
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: color
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-credentials
        key: password
```

### 2. Монтування як файли (Volumes)

Весь ConfigMap або Secret можна змонтувати як папку, де кожен ключ стане файлом, а значення — вмістом файлу. Це зручно для великих конфігураційних файлів.

```yaml
volumes:
  - name: config-volume
    configMap:
      name: app-config
  - name: secret-volume
    secret:
      secretName: db-credentials
containers:
  - name: app
    volumeMounts:
      - name: config-volume
        mountPath: /etc/config
      - name: secret-volume
        mountPath: /etc/secrets
        readOnly: true
```

### 3. Завантаження всіх значень (`envFrom`)

Якщо потрібно завантажити всі пари ключ-значення як змінні оточення.

```yaml
envFrom:
  - configMapRef:
      name: app-config
  - secretRef:
      name: db-credentials
```

### 4. Аргументи командного рядка (Command-line arguments)

Змінні з ConfigMap можна використовувати безпосередньо в аргументах запуску контейнера.

```yaml
containers:
  - name: app-container
    image: busybox
    command: [ "sh", "-c", "echo $(MESSAGE)" ]
    env:
      - name: MESSAGE
        valueFrom:
          configMapKeyRef:
            name: app-config
            key: welcome-msg
```

---

## Просунуті техніки роботи з конфігураціями

### Монтування специфічних ключів як окремих файлів (`subPath`)

Зазвичай монтування ConfigMap замінює весь вміст цільової директорії. Щоб додати один файл у вже існуючу папку (наприклад, `/etc/`), використовуйте `subPath`.

```yaml
volumeMounts:
  - name: config-volume
    mountPath: /etc/nginx/conf.d/custom.conf
    subPath: nginx.conf
```

### Створення ConfigMap/Secret з файлів

Замість того, щоб копіювати текст у YAML, можна створити об'єкт безпосередньо з файлу:
```bash
# Створення ConfigMap з файлу
kubectl create configmap nginx-config --from-file=nginx.conf

# Створення Secret з декількох файлів
kubectl create secret generic ssl-certs --from-file=tls.crt --from-file=tls.key
```

### Immutable ConfigMaps та Secrets

Щоб запобігти випадковим змінам критичної конфігурації та зменшити навантаження на API-server (Kubernetes не буде відстежувати зміни), можна позначити ресурс як незмінний:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: immutable-config
immutable: true
data:
  VERSION: "1.0.2"
```

---

## Динамічне оновлення конфігурацій

| Спосіб передачі | Автоматичне оновлення в Pod | Примітка |
| :--- | :--- | :--- |
| **Environment Variables** | ❌ Ні | Потрібен перезапуск Pod (restart/rollout) |
| **Volumes (Files)** | ✅ Так | Kubelet оновлює файли протягом ~1-2 хвилин |
| **subPath** | ❌ Ні | Файли, змонтовані через subPath, не оновлюються |

---

## Дефолтні значення для змінних оточення

При розробці додатків для Kubernetes важливо передбачити значення за замовчуванням. Це дозволяє додатку запуститися навіть без ConfigMap/Secret.

### 1. На рівні коду (Node.js)
```javascript
const PORT = process.env.PORT || 8080;
const APP_TITLE = process.env.APP_TITLE || 'Default Title';
```

### 2. У Dockerfile (`ENV`)
```dockerfile
FROM node:18-slim
ENV APP_COLOR="#f0f0f0"
ENV PORT=8080
COPY server.js .
CMD ["node", "server.js"]
```

### 3. У Pod Manifest
Якщо змінна не задана в ConfigMap, Kubernetes не має вбудованого механізму "fallback" у `valueFrom`. Тому дефолти краще тримати в коді або Dockerfile.

---

## Робота з демонстраційним додатком

Цей додаток відображає всі змінні оточення у браузері. Це дозволить вам відстежити, які дані прийшли з ConfigMap, а які — зі Secret.

```bash
# Вхід до Docker Hub
docker login

# Перехід у директорію з додатком
cd lectures/lec5/app

# Збірка Docker-образу (версія v3)
docker build -t lisnyak/env-viewer:v3 .

# Локальний запуск контейнера для перевірки (передача кольору через змінну оточення)
docker run -p 8081:8080 -e APP_COLOR="#ff0000" lisnyak/env-viewer:v3
```
Відкрийте `http://localhost:8081` у браузері — ви побачите червоний фон.
```bash
# Публікація образу в Docker Hub
docker push lisnyak/env-viewer:v3

# Запуск простого Pod без конфігурацій
kubectl apply -f ./k8s/env-viewer-pod.yaml
```
Відкрийте `http://localhost:8081` у браузері — ви побачите червоний фон.

```bash
# Імперативне створення ConfigMap з конкретними значеннями
kubectl create configmap env-config \
  --from-literal=APP_TITLE="Imperative App Title" \
  --from-literal=APP_COLOR="#ff5733"

# Перегляд списку ConfigMaps
kubectl get configmaps

# Детальна інформація про створений ConfigMap
kubectl describe configmaps

Name:         env-config
Namespace:    default
Labels:       <none>
Annotations:  <none>

Data
====
APP_COLOR:
----
#ff5733

APP_TITLE:
----
Imperative App Title
```
```bash
# Запуск Pod, що використовує значення з ConfigMap (приклад T1)
kubectl apply -f ./k8s/env-viewer-pod-t1.yaml 

# Експорт існуючого ConfigMap у YAML файл (декларативний підхід)
kubectl get configmap env-config -o yaml > ./k8s/env-config.yaml 

# Пристосування конфігурації з файлу
kubectl apply -f ./k8s/env-config.yaml

# Запуск Pod з посиланням на ключі ConfigMap (приклад T2)
kubectl apply -f ./k8s/env-viewer-pod-t2.yaml

# Запуск Pod з автоматичним підключенням всіх значень з ConfigMap та Secret (приклад T4)
kubectl apply -f ./k8s/env-viewer-pod-t4.yaml

# Створення ConfigMap з файлу
kubectl create configmap file-config --from-file=./k8s/app-settings.properties

# Перегляд створеного ConfigMap у форматі YAML
kubectl get configmap file-config -o yaml

# Запуск Pod з монтуванням ConfigMap як файлової системи (Volume)
kubectl apply -f ./k8s/env-viewer-pod-t5.yaml

# Перевірка вмісту змонтованого файлу всередині Pod
kubectl exec env-viewer-pod-t5 -- cat /etc/config/app-settings.properties

# Оновлення ConfigMap (зміна значення у існуючому ConfigMap)
kubectl patch configmap file-config -p '{"data":{"app-settings.properties":"APP_NAME=UpdatedViewer\nAPP_VERSION=v4\nDEBUG_MODE=false"}}'

# Зачекайте 1-2 хвилини, поки Kubelet оновить змонтований файл
# Перевірка оновленого вмісту змонтованого файлу всередині Pod (без перезапуску Pod!)
kubectl exec env-viewer-pod-t5 -- cat /etc/config/app-settings.properties

# Створення ConfigMap з JSON-файлу
kubectl create configmap json-config --from-file=./k8s/config.json

# Запуск Pod з монтуванням JSON-конфігурації
kubectl apply -f ./k8s/env-viewer-pod-t6.yaml

# Перевірка вмісту JSON-файлу всередині Pod
kubectl exec env-viewer-pod-t6 -- cat /app/config/config.json

# Запуск Повного прикладу (Deployment + Service)
kubectl apply -f ./k8s/env-viewer-deployment.yaml
kubectl apply -f ./k8s/env-viewer-service.yaml

# Перевірка статусу розгортання та сервісу
kubectl get deployments
kubectl get svc env-viewer-service

# Прокидання порту для доступу до сервісу (якщо використовуєте локальний кластер)
kubectl port-forward svc/env-viewer-service 8081:80
# Після цього додаток буде доступний за адресою http://localhost:8081

# Оновлення ConfigMap (декларативно через файл)
# 1. Відредагуйте ./k8s/env-config.yaml (наприклад, змініть APP_TITLE)
# 2. Застосуйте зміни:
kubectl apply -f ./k8s/env-config.yaml

# УВАГА: Оскільки ConfigMap підключений як змінні оточення (envFrom), 
# Deployment НЕ підхопить зміни автоматично. Потрібно перезапустити Pods:
kubectl rollout restart deployment env-viewer-deployment

# Відстеження процесу оновлення
kubectl rollout status deployment env-viewer-deployment
```

