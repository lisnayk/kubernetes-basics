# Корисні команди для демонстрації RBAC (Лекція 9)

### 1. Підготовка: перевірка поточного контексту
Перед початком роботи переконайтеся, що ви перебуваєте в правильному контексті (адміністратора).
```bash
# Перевірка поточного контексту
kubectl config current-context

# Перегляд списку всіх контекстів
kubectl config get-contexts
```

### 2. Отримання списку користувачів та ServiceAccounts
У Kubernetes немає окремого об'єкта "User", але ми можемо побачити тих, хто налаштований у нашому `kubeconfig`, або системні облікові записи (ServiceAccounts).
```bash
# Перегляд користувачів у поточному файлі конфігурації (kubeconfig)
kubectl config get-users

# Перегляд усіх ServiceAccounts у кластері
kubectl get sa -A

# Перегляд ServiceAccounts у конкретному неймспейсі
kubectl get sa -n development
```

### 3. Перевірка без прав (очікуємо Forbidden)
```bash
kubectl get pods --as developer
kubectl get pods -n development --as developer
```

### 4. Створення Namespace для тесту
```bash
kubectl create namespace development
```

### 5. Призначення та оновлення прав (Role)
```bash
# Створення або оновлення ролі з файлу
kubectl apply -f k8s/role.yaml

# Пряме редагування ролі в кластері
kubectl edit role pod-reader -n development

# Додавання прав через CLI (якщо роль вже існує, ця команда може не спрацювати для оновлення, краще apply)
# kubectl patch role pod-reader -n development --patch '{"rules":[{"apiGroups":[""],"resources":["pods","services"],"verbs":["get","list"]}]}'
```

### 6. Перевірка після призначення прав
```bash
# Тепер має працювати
kubectl get pods -n development --as developer

# Все ще має бути Forbidden (інший неймспейс)
kubectl get pods -n default --as developer
```

### 7. Перевірка та оновлення прав на ноди (ClusterRole)
```bash
# Очікуємо Forbidden
kubectl get nodes --as developer

# Призначаємо або оновлюємо ClusterRole
kubectl apply -f k8s/cluster-role.yaml

# Редагування ClusterRole напряму
# kubectl edit clusterrole node-reader
```

### 8. Використання `auth can-i`
```bash
# Чи можу я видаляти поди в development?
kubectl auth can-i delete pods -n development --as developer

# Чи можу я створювати деплойменти?
kubectl auth can-i create deployments --as developer

# Список всіх моїх прав (тільки для поточного контексту)
kubectl auth can-i --list --as developer
```

### 9. Робота з токенами (ServiceAccount)
```bash
# Створення SA та секрету з токеном
kubectl apply -f k8s/sa.yaml
kubectl apply -f k8s/token-secret.yaml

# Отримання токена зі Secret
TOKEN=$(kubectl get secret build-robot-token -n development -o jsonpath='{.data.token}' | base64 -d)

# АБО генерація тимчасового токена (K8s 1.24+)
TOKEN=$(kubectl create token build-robot -n development)
```

### 10. Запуск Pod із конкретним ServiceAccount
```bash
# Створення Pod, який використовує ServiceAccount 'build-robot'
kubectl apply -f k8s/pod-with-sa.yaml

# Перегляд деталей поду для перевірки змонтованого токена
kubectl get pod sa-test-pod -n development -o yaml | grep serviceAccountName
```

### 11. Перевірка використання ServiceAccount всередині Pod
```bash
# 1. Опис поду (шукаємо рядок 'Service Account: build-robot')
kubectl describe pod sa-test-pod -n development

# 2. Перевірка змонтованого токена всередині контейнера
kubectl exec sa-test-pod -n development -- ls /var/run/secrets/kubernetes.io/serviceaccount/

# 3. Спроба використати токен для запиту до API з самого поду (якщо в образі є curl)
# TOKEN=$(kubectl exec sa-test-pod -n development -- cat /var/run/secrets/kubernetes.io/serviceaccount/token)
# kubectl exec sa-test-pod -n development -- curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default/api/v1/namespaces/development/pods
```

### 12. Додавання ServiceAccount у контекст
```bash
# 1. Створюємо тимчасовий токен (наприклад, на 24 години)
TOKEN=$(kubectl create token build-robot -n development --duration=24h)

# 2. Додаємо користувача у конфігурацію (вказавши токен)
kubectl config set-credentials build-robot-user --token=$TOKEN

# 3. Додаємо контекст для цього користувача (cluster ім'я можна дізнатися через kubectl config get-clusters)
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
kubectl config set-context sa-context --cluster=$CLUSTER_NAME --user=build-robot-user --namespace=development

# 4. Використання нового контексту
kubectl config use-context sa-context

# 5. Тепер ми діємо від імені ServiceAccount
kubectl get pods
```

### 13. Приклади API-запитів через curl

Для тестування API безпосередньо через HTTP можна використовувати `kubectl proxy` (пропускає автентифікацію локально) або прямий доступ з токеном.

#### Варіант А: Через kubectl proxy (простіше для тестів)
1. Запустіть проксі в окремому терміналі: `kubectl proxy --port=8080`
2. Виконуйте запити:
```bash
# Отримання списку всіх неймспейсів (потребує прав адміністратора)
curl http://localhost:8080/api/v1/namespaces

# Отримання подів у неймспейсі development
curl http://localhost:8080/api/v1/namespaces/development/pods

# Отримання конкретного поду
curl http://localhost:8080/api/v1/namespaces/development/pods/my-pod-name
```

#### Варіант Б: Прямий доступ до API з токеном
Цей метод використовується програмами, які працюють ззовні кластера.
```bash
# Отримуємо адресу API сервера
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')

# Виконуємо запит з токеном (додаємо -k для ігнорування самопідписаних сертифікатів, якщо потрібно)
curl -X GET $APISERVER/api/v1/namespaces/development/pods \
  -H "Authorization: Bearer $TOKEN" \
  -k
```

#### Варіант В: Створення ресурсу через API (POST)
```bash
# Створення поду через JSON-запит
cat <<EOF > pod.json
{
  "apiVersion": "v1",
  "kind": "Pod",
  "metadata": { "name": "api-test-pod" },
  "spec": {
    "containers": [{
      "name": "nginx",
      "image": "nginx:alpine"
    }]
  }
}
EOF

curl -X POST $APISERVER/api/v1/namespaces/development/pods \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @pod.json \
  -k
```

### 14. Перевірка прав для ServiceAccount (через kubectl)
```bash
# Перевірка прав (повне ім'я SA: system:serviceaccount:<namespace>:<name>)
kubectl auth can-i get pods -n development --as system:serviceaccount:development:build-robot

### 15. Повернення до дефолтного контексту
Після завершення експериментів з новими користувачами або ServiceAccounts важливо вміти повертатися до основного контексту адміністратора кластера.

```bash
# Переглянути список доступних контекстів
kubectl config get-contexts

# Повернення до основного контексту
kubectl config use-context kind-kind
```

### 16. Очищення тимчасових налаштувань
(Опціонально) Видалити тимчасовий контекст та користувача, якщо вони більше не потрібні.

```bash
kubectl config delete-context sa-context
kubectl config delete-user build-robot-user
```
