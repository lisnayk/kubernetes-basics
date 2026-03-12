# Лабораторна робота №5. Робота з Persistent Data та StatefulSet

## Мета роботи
Навчитися працювати з даними в Kubernetes, використовувати **PersistentVolumes**, **PersistentVolumeClaims** та розгортати додатки зі станом (stateful) за допомогою **StatefulSet**.

## Завдання
В цій лабораторній роботі ми розширимо архітектуру з Лабораторної роботи №4, додавши до неї рівень збереження даних (Database Layer).

### 1. Архітектура
Необхідно додати до існуючої схеми два сервери баз даних:
- **MySQL**: для `api-backend`.
- **MongoDB**: для `api-products`.

```mermaid
graph TD
    User([Користувач]) -- "Ingress" --> Ingress_Svc[Service: app-ingress]

    subgraph "Namespace: lab5"
        Ingress_Svc --> FE_Svc[Service: vue-frontend]
        Ingress_Svc --> BE_Svc[Service: api-backend]
        
        subgraph "Frontend Component"
            FE_Svc --> FE_Deploy[Deployment: vue-frontend]
            FE_Deploy --> FE_Pod[Pod: vue-frontend]
        end

        subgraph "Backend Component"
            BE_Svc --> BE_Deploy[Deployment: api-backend]
            BE_Deploy --> BE_Pod[Pod: api-backend]
        end
        
        subgraph "Products API Component"
            BE_Pod -- "API Key Auth" --> APIP_Svc[Service: api-products]
            APIP_Svc --> APIP_Deploy[Deployment: api-products]
            APIP_Deploy --> APIP_Pod[Pod: api-products]
        end

        subgraph "Database Layer (StatefulSet)"
            MySQL_Svc[Headless Service: mysql]
            MySQL_SS[StatefulSet: mysql]
            MySQL_Pod[Pod: mysql-0]
            MySQL_PVC[(PVC: mysql-data)]
            
            Mongo_Svc[Headless Service: mongodb]
            Mongo_SS[StatefulSet: mongodb]
            Mongo_Pod[Pod: mongodb-0]
            Mongo_PVC[(PVC: mongo-data)]

            MySQL_Svc -. "DNS Discovery" .-> MySQL_SS
            MySQL_SS --> MySQL_Pod
            MySQL_Pod --- MySQL_PVC

            Mongo_Svc -. "DNS Discovery" .-> Mongo_SS
            Mongo_SS --> Mongo_Pod
            Mongo_Pod --- Mongo_PVC
        end

        BE_Pod -- "JDBC/SQL" --> MySQL_Svc
        APIP_Pod -- "Mongo Protocol" --> Mongo_Svc

        subgraph "Config & Secrets (Shared)"
            CM[ConfigMap: app-config]
            Sec[Secret: app-secrets]
            MySQL_Secret[Secret: mysql-secret]
            Mongo_Secret[Secret: mongo-secret]
        end

        MySQL_Secret -. "env: MYSQL_ROOT_PASSWORD" .-> MySQL_Pod
        Mongo_Secret -. "env: MONGO_INITDB_ROOT_*" .-> Mongo_Pod

        CM -. "env" .-> BE_Pod
        CM -. "env" .-> APIP_Pod
        Sec -. "env: API_KEY" .-> BE_Pod
        Sec -. "env: API_KEYS" .-> APIP_Pod
    end

    %% Styles
    style MySQL_Secret fill:#ffebee,stroke:#c62828,stroke-width:2px
    style Mongo_Secret fill:#ffebee,stroke:#c62828,stroke-width:2px
    style MySQL_SS fill:#e8f5e9,stroke:#2e7d32
    style Mongo_SS fill:#e8f5e9,stroke:#2e7d32
    style MySQL_Pod fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray: 5 5
    style Mongo_Pod fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray: 5 5
    style CM fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    style Sec fill:#ffebee,stroke:#c62828,stroke-width:2px
    style BE_Pod fill:#e8f5e9,stroke:#2e7d32,stroke-dasharray: 5 5
    style APIP_Pod fill:#fce4ec,stroke:#c2185b,stroke-dasharray: 5 5
    style FE_Pod fill:#e1f5fe,stroke:#01579b,stroke-dasharray: 5 5
```

### 2. Вимоги до реалізації

#### Бази даних (StatefulSet)
1. **MySQL**:
   - Використати образ `mysql:5.7`.
   - Пароль `root` має зберігатися у **Secret**.
   - Налаштувати **Headless Service** для доступу.
   - Використати `volumeClaimTemplates` для створення тому об'ємом `1Gi`.
   - Назва бази даних за замовчуванням: `lab5_db`.

2. **MongoDB**:
   - Використати образ `mongo:4.4`.
   - Логін та пароль `root` мають зберігатися у **Secret**.
   - Налаштувати **Headless Service**.
   - Використати `volumeClaimTemplates` для створення тому об'ємом `1Gi`.
   - Назва бази даних за замовчуванням: `lab5_products`.

#### Оновлення існуючих сервісів (Deployments)
Необхідно оновити маніфести з Лабораторної роботи №4:
1. Передати параметри підключення до баз даних через змінні оточення в `api-backend` та `api-products`.
2. Використати DNS-імена сервісів баз даних (наприклад, `mysql.lab5.svc.cluster.local`).

### 3. Порядок виконання

1. Створіть новий Namespace `lab5`.
2. Розгорніть **Secrets** для MySQL та MongoDB.
3. Розгорніть **StatefulSet** для MySQL та MongoDB.
4. Перевірте створення **PersistentVolumeClaims (PVC)** та **PersistentVolumes (PV)**:
   ```bash
   kubectl get pvc -n lab5
   kubectl get pv
   ```
5. Перевірте стабільність мережевих ідентифікаторів. Спробуйте видалити один з Pod-ів StatefulSet і переконайтеся, що новий Pod отримав те саме ім'я та підключив той самий диск.
6. Оновіть та розгорніть `api-backend` та `api-products`.

### 4. Контрольні питання
1. Чим відрізняється робота з дисками у `Deployment` (через `volumes`) та у `StatefulSet` (через `volumeClaimTemplates`)?
2. Що таке **Headless Service** і навіщо він потрібен для баз даних?
3. Що станеться з даними в `mysql-data-mysql-0` PVC, якщо ви видалите `StatefulSet`?
4. Які переваги надає стабільний мережевий ідентифікатор (`pod-0.service-name`) для систем реплікації?
