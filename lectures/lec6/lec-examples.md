# Практичні приклади до Лекції №6: Volumes та StatefulSet

Цей документ містить маніфести для реалізації основних сценаріїв роботи з даними в Kubernetes, які розглядалися на лекції.

---

## Сценарій 1: Ефемерні та Локальні томи (Тимчасове зберігання)

### 1.1 emptyDir: Спільне сховище для контейнерів
Цей приклад показує, як два контейнери в одному Pod використовують спільну папку `/shared-logs`. Один пише логи, інший їх читає.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: empty-dir-pod
spec:
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c", "while true; do date >> /logs/app.log; sleep 5; done"]
    volumeMounts:
    - name: logs-volume
      mountPath: /logs
  - name: reader
    image: busybox
    command: ["sh", "-c", "tail -f /logs/app.log"]
    volumeMounts:
    - name: logs-volume
      mountPath: /logs
  volumes:
  - name: logs-volume
    emptyDir: {}
```

**Команди для запуску та перевірки:**
```bash
# Створити Pod
kubectl apply -f k8s/empty-dir-pod.yaml

# Перевірити статус Pod
kubectl get pod empty-dir-pod

# Переглянути логи з контейнера reader (він читає файл, який пише writer)
kubectl logs -f empty-dir-pod -c reader

# Зайти всередину контейнера writer і перевірити файл вручну
kubectl exec -it empty-dir-pod -c writer -- ls -l /logs/app.log
```

### 1.2 Завантаження контенту (InitContainers замість gitRepo)
*Примітка: Тип `gitRepo` застарілий (deprecated) і вимагає наявності `git` на самій ноді (хості). Сучасний підхід — використання Init-контейнера.*

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: git-repo-pod
spec:
  # Init-контейнер виконується ПЕРЕД основним контейнером
  initContainers:
  - name: git-clone
    image: alpine/git
    args:
      - clone
      - --single-branch
      - --
      - https://github.com/lisnayk/k8n-lec6-example.git
      - /repo
    volumeMounts:
    - name: html-content
      mountPath: /repo
  containers:
  - name: nginx
    image: nginx
    volumeMounts:
    - name: html-content
      mountPath: /usr/share/nginx/html
  volumes:
  - name: html-content
    emptyDir: {} # Клонуємо дані в тимчасову пам'ять
```

**Команди для запуску та перевірки:**
```bash
# Створити Pod
kubectl apply -f k8s/git-repo-pod.yaml

# Перевірити, чи завантажився контент (запит до Nginx всередині поду)
kubectl exec git-repo-pod -- curl localhost
```

### 1.3 hostPath: Доступ до файлів вузла (Node)
Цей приклад показує, як Pod може отримати доступ до логів самої операційної системи вузла. 
*Застереження: Використовуйте hostPath тільки для системних завдань!*

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: host-path-pod
spec:
  containers:
  - name: log-viewer
    image: busybox
    command: ["sh", "-c", "tail -f /node-logs/syslog || tail -f /node-logs/messages"]
    volumeMounts:
    - name: node-logs
      mountPath: /node-logs
      readOnly: true
  volumes:
  - name: node-logs
    hostPath:
      path: /var/log
      type: Directory
```

**Команди для запуску та перевірки:**
```bash
# Створити Pod
kubectl apply -f k8s/host-path-pod.yaml

# Переглянути логи вузла через Pod
kubectl logs host-path-pod

# Перевірити список файлів у змонтованій директорії
kubectl exec host-path-pod -- ls /node-logs
```

---

## Сценарій 2: Статичні PV та PVC (Ручне керування)

Цей сценарій демонструє, як адміністратор виділяє конкретний ресурс, а розробник його запитує.

### 2.1 PersistentVolume (PV) — Адмін створює диск
```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: static-pv-mysql
spec:
  capacity:
    storage: 2Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  hostPath:
    path: "/mnt/data/mysql"
```

### 2.2 PersistentVolumeClaim (PVC) — Розробник запитує диск
```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: static-pvc-mysql
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
  # Вказуємо порожній рядок, щоб Kubernetes не шукав StorageClass, 
  # а шукав серед існуючих статичних PV
  storageClassName: ""
```

### 2.3 Використання PVC у Pod (MySQL)
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: mysql-static-pod
spec:
  containers:
  - name: mysql
    image: mysql:5.7
    env:
    - name: MYSQL_ROOT_PASSWORD
      valueFrom:
        secretKeyRef:
          name: mysql-secret
          key: mysql-root-password
    volumeMounts:
    - name: mysql-data
      mountPath: /var/lib/mysql
  volumes:
  - name: mysql-data
    persistentVolumeClaim:
      claimName: static-pvc-mysql
```

**Команди для запуску та перевірки:**
```bash
# Створити PV, PVC та Pod (послідовно)
kubectl apply -f k8s/mysql-secret.yaml
kubectl apply -f k8s/static-pv.yaml
kubectl apply -f k8s/static-pvc.yaml
kubectl apply -f k8s/mysql-static-pod.yaml

# Перевірити статус PV та PVC (мають бути Bound)
kubectl get pv static-pv-mysql
kubectl get pvc static-pvc-mysql

# Перевірити, що MySQL запустився і використовує том
kubectl describe pod mysql-static-pod
```

---

## Сценарій 3: Динамічні PV та StatefulSet (Автоматика)

Це найбільш сучасний підхід, де диски створюються автоматично хмарним провайдером.

### 3.1 StorageClass (Опис типу сховища)
*Примітка: У кластері Kind за замовчуванням вже є StorageClass з іменем `standard`. Створювати новий не обов'язково, але цей приклад показує, як він налаштовується.*

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: standard
provisioner: rancher.io/local-path # Для Kind. Або інший провайдер (GCP, Azure)
parameters:
#  type: gp2 # Параметри залежать від провайдера
reclaimPolicy: Delete
```

### 3.2 StatefulSet з MySQL (VolumeClaimTemplates)
Кожна репліка отримає свій унікальний диск автоматично.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
spec:
  serviceName: "mysql"
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:5.7
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: mysql-root-password
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "standard"
      resources:
        requests:
          storage: 1Gi
```

**Команди для запуску та перевірки:**
```bash
# Перевірити наявні StorageClass (у Kind має бути 'standard' за замовчуванням)
kubectl get sc

# Створити StorageClass (якщо його немає або ви хочете інший), секрет, сервіс та StatefulSet
kubectl apply -f k8s/mysql-secret.yaml
# kubectl apply -f k8s/storage-class.yaml # Пропустіть, якщо 'standard' вже є
kubectl apply -f k8s/mysql-service.yaml
kubectl apply -f k8s/mysql-statefulset.yaml

# Спостерігати за порядковим створенням Pod-ів (0, потім 1, потім 2)
kubectl get pods -l app=mysql -w

# Перевірити автоматично створені PVC для кожного поду
kubectl get pvc -l app=mysql

# Перевірити DNS-імена Pod-ів (якщо створено Headless Service)
kubectl exec mysql-0 -- hostname -f
```

---

## Як перевірити результати:

1. **Для ефемерних:** `kubectl logs -f empty-dir-pod -c reader` (побачите записи дати).
2. **Для статичних:** `kubectl get pv,pvc` (статус має бути `Bound`).
3. **Для динамічних:** `kubectl get statefulset`, потім `kubectl get pvc`. Ви побачите 3 окремих PVC: `mysql-data-mysql-0`, `mysql-data-mysql-1`, `mysql-data-mysql-2`.
