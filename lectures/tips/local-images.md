# Використання локальних образів у Docker Desktop та Kind

При локальній розробці в Kubernetes часто виникає потреба запустити образ, який ви щойно зібрали на своєму комп'ютері, не завантажуючи його у віддалений реєстр (Docker Hub тощо).

## 1. Вбудований Kubernetes у Docker Desktop

Якщо ви використовуєте Kubernetes, який входить до складу **Docker Desktop**:
- **Автоматичний доступ**: Kubernetes у Docker Desktop використовує той самий Docker daemon, що і ваш термінал. Будь-який образ, який ви зібрали через `docker build`, вже доступний для кластера.
- **Важливе правило**: Ви повинні вказати `imagePullPolicy: Never` або `imagePullPolicy: IfNotPresent` у вашому Deployment/Pod. Якщо залишити `Always` (або не вказати тег `:latest`), Kubernetes спробує завантажити образ із реєстру і видасть помилку `ErrImagePull`.

```yaml
spec:
  containers:
  - name: my-app
    image: my-local-image:latest
    imagePullPolicy: IfNotPresent
```

## 2. Локальний кластер Kind

**Kind** (Kubernetes in Docker) працює інакше: він запускає Kubernetes всередині Docker-контейнерів. Тому він має власний "внутрішній" Docker daemon, який не бачить образів на вашому хості.

Щоб "перекинути" образ у Kind, використовуйте команду:
```bash
# 1. Збираємо образ на хості
docker build -t my-app:v1 .

# 2. Завантажуємо його в кластер Kind
kind load docker-image my-app:v1
```

Після цього образ стане доступним для використання в маніфестах. Не забудьте про `imagePullPolicy: IfNotPresent`.

## 3. Чому мій образ не бачить Kubernetes? (Чек-лист)

1. **Неправильний тег**: Ви збісили `my-app:latest`, а в YAML вказали `my-app:v1`.
2. **imagePullPolicy: Always**: Це змушує K8s завжди йти в інтернет за образом. Для локальних образів використовуйте `Never` або `IfNotPresent`.
3. **Kind не отримав образ**: Якщо ви використовуєте Kind, ви **обов'язково** маєте виконати `kind load`.
4. **Різні контексти**: Переконайтеся, що `kubectl config current-context` вказує на той кластер, куди ви завантажили образ.

## 4. Використання змінних оточення (Environment Variables)

Для того, щоб ваш додаток міг працювати з різними конфігураціями (наприклад, локально чи в кластері), використовуйте змінні оточення в маніфестах Kubernetes.

### Пряме визначення в Deployment
```yaml
spec:
  containers:
  - name: my-app
    image: my-app:latest
    env:
    - name: DATABASE_URL
      value: "postgres://db.local:5432/mydb"
    - name: LOG_LEVEL
      value: "debug"
```

### Використання значень із ConfigMap або Secret
Це кращий підхід для великої кількості налаштувань.
```yaml
envFrom:
- configMapRef:
    name: app-config
- secretRef:
    name: app-secrets
```

### Динамічне отримання значень (FieldRef)
Корисно для отримання інформації про сам Pod (наприклад, назва неймспейсу).
```yaml
env:
- name: MY_NAMESPACE
  valueFrom:
    fieldRef:
      fieldPath: metadata.namespace
```

## Резюме
- **Docker Desktop K8s**: Зібрав -> Використав (з `IfNotPresent`).
- **Kind**: Зібрав -> `kind load docker-image` -> Використав.
- **Змінні оточення**: Дозволяють гнучко налаштовувати додаток без перезбірки образу.
