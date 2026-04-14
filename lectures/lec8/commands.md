# Демо-команди: Робота з сертифікатами та RBAC

## 1. Створення Ключа та Запиту на сертифікат (CSR)

Спершу ми створюємо приватний ключ для користувача та файл-анкету (CSR), де вказуємо його ім'я та групу.

```bash
# 1. Створюємо приватний ключ (наша "печатка")
openssl genrsa -out developer.key 2048

# 2. Створюємо запит на підпис сертифіката (наша "анкета")
# CN (Common Name) - це ім'я користувача в K8s
# O (Organization) - це назва групи
openssl req -new -key developer.key -out developer.csr -subj "/CN=developer/O=app-team"
```

## 2. Відправка запиту в Kubernetes

Тепер ми маємо сказати Kubernetes, що хочемо підписати цей сертифікат. Для цього створюється об'єкт `CertificateSigningRequest`.

```bash
# Перетворюємо CSR у формат base64 (потрібно для YAML)

# Linux (Bash):
export CSR_BASE64=$(cat developer.csr | base64 | tr -d '\n')

# Windows (PowerShell):
$CSR_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("developer.csr"))

# Застосовуємо CSR у Kubernetes

# Linux (Bash):
# Використовуємо envsubst або sed для підстановки
sed "s|<BASE64_HERE>|$CSR_BASE64|" k8s/csr.yaml | kubectl apply -f -

# Windows (PowerShell):
# Ми беремо файл k8s/csr.yaml, замінюємо в ньому заглушку на наш base64 і відправляємо в kubectl
(Get-Content k8s/csr.yaml) -replace '<BASE64_HERE>', $CSR_BASE64 | kubectl apply -f -
```

## 3. Схвалення та отримання сертифіката

Адміністратор має перевірити та схвалити запит.

```bash
# Перегляд запитів
kubectl get csr

# Схвалення запиту
kubectl certificate approve developer-csr

# Витягуємо готовий сертифікат (наша "перепустка")

# Linux (Bash):
kubectl get csr developer-csr -o jsonpath='{.status.certificate}' | base64 -d > developer.crt

# Windows (PowerShell):
$CERT = kubectl get csr developer-csr -o jsonpath='{.status.certificate}'
[IO.File]::WriteAllBytes("developer.crt", [Convert]::FromBase64String($CERT))
```

## 4. Налаштування kubectl (Context)

Тепер додамо цього користувача в наш конфіг, щоб ми могли діяти від його імені.

```bash
# Перегляд поточного конфігураційного файлу (де зберігаються всі ключі та контексти)
# Linux (Bash):
cat ~/.kube/config

# Windows (PowerShell):
Get-Content $HOME\.kube\config

# Додаємо користувача в config
kubectl config set-credentials developer --client-certificate=developer.crt --client-key=developer.key

# Створюємо контекст для цього користувача
kubectl config set-context developer-context --cluster=kind-kind --user=developer

# Перемикання на новий контекст (тепер ви дієте як developer)
kubectl config use-context developer-context

# Повернення до адмін-контексту (замініть 'kind-kind' на назву вашого адмін-контексту)
# Щоб дізнатися назви всіх контекстів:
kubectl config get-contexts
kubectl config use-context kind-kind

# Перевіряємо права (спойлер: спочатку буде "no", бо ми ще не створили RoleBinding)
kubectl auth can-i get pods --as=developer

## 5. Надання прав (RBAC)

Щоб користувач міг щось робити, треба створити зв'язку між ним та роллю.

```bash
# Створення Role та RoleBinding (через kubectl для швидкості)
kubectl create role pod-reader --verb=get,list,watch --resource=pods
kubectl create rolebinding developer-pod-reader --role=pod-reader --user=developer

# Тепер перевірка має повернути "yes"
kubectl auth can-i get pods --as=developer
```

## 6. Виконання запитів до API (Direct API calls)

Ви можете звертатися до API сервера напряму через `curl`, використовуючи ваші сертифікати або токени.

### А. Використання клієнтського сертифіката (User)

Цей метод використовує файли `developer.crt` та `developer.key`, які ви отримали раніше.

```bash
# 1. Дізнаємося адресу API сервера
export =$(kubectl config view -o jsonpath='{.clusters[0].cluster.server}')

# 2. Отримуємо кореневий сертифікат кластера (ca.crt), щоб curl міг довіряти серверу
# В багатьох кластерах його можна дістати з конфігу:
cle

# 3. Виконуємо запит через curl (Linux/Bash)
curl --cacert ca.crt --cert developer.crt --key developer.key $KUBE_API/api/v1/namespaces/default/pods

# 4. Перевірка версії через curl
curl --cacert ca.crt --cert developer.crt --key developer.key $KUBE_API/version

### В. Поширені помилки при запитах (Troubleshooting)

При використанні `curl` ви можете зіткнутися з різними кодами помилок. Важливо розрізняти їх:

1.  **401 Unauthorized (Неавторизовано):** Сервер не впізнав вас.
    *   *Причина:* Неправильний сертифікат, прострочений токен або помилка в CA.
2.  **403 Forbidden (Заборонено):** Сервер знає, хто ви, але **вам не дозволено** виконувати цю дію.
    *   *Причина:* Відсутній `RoleBinding` або `ClusterRoleBinding` для вашого користувача/групи.
    *   *Приклад:* `curl -k --cert ... --key ... $KUBE_API/api/v1/pods` поверне `Forbidden`, якщо у користувача немає прав на перегляд подів.
3.  **Помилка TLS (SSL certificate problem):**
    *   *Причина:* Ви не вказали `--cacert ca.crt` або сертифікат сервера не підписаний вашим CA.
    *   *Рішення:* Використовуйте `-k` (або `--insecure`), щоб пропустити перевірку, але це **небезпечно** в реальних проектах.

```bash
# Приклад запиту, який поверне 403 Forbidden, якщо права не налаштовані
curl -k --cert developer.crt --key developer.key $KUBE_API/api/v1/namespaces/default/pods
```

### Б. Використання токена ServiceAccount

```bash
# 1. Отримуємо токен (для K8s 1.24+ потрібно створювати токен вручну або брати з секрету)
export TOKEN=$(kubectl create token my-app-sa)

# 2. Запит до API (Linux/Bash)
# -k використовується, щоб пропустити перевірку сертифіката сервера (якщо немає ca.crt)
curl -k -H "Authorization: Bearer $TOKEN" $KUBE_API/api/v1/namespaces/default/pods

# 3. Запит через PowerShell (Windows)
$TOKEN = kubectl create token my-app-sa
$HEADERS = @{ Authorization = "Bearer $TOKEN" }
Invoke-RestMethod -Uri "$KUBE_API/api/v1/namespaces/default/pods" -Headers $HEADERS -SkipCertificateCheck
```


## 7. Використання kubectl proxy (Access API via Proxy)

`kubectl proxy` створює локальний HTTP-сервер, який автоматично автентифікує ваші запити за допомогою ваших поточних облікових даних (сертифікатів або токенів) з `kubeconfig`.

```bash
# 1. Запускаємо проксі (він буде працювати у фоні або окремому терміналі)
kubectl proxy --port=8080

# 2. Тепер ви можете робити запити до API без сертифікатів і ключів
# (Проксі сам додасть потрібну авторизацію)
curl http://localhost:8080/api/v1/namespaces/default/pods

# 3. Перевірка версії через проксі
curl http://localhost:8080/version
```

**Чому це зручно?**
- Вам не потрібно вручну прописувати шляхи до `ca.crt`, `developer.crt` та `developer.key`.
- Це безпечний спосіб дати доступ локальним інструментам до API.

## 8. Робота з OpenAPI v3 (Discovery & Schema)

Kubernetes API надає специфікацію OpenAPI v3, яка дозволяє клієнтам (таким як `kubectl` або генератори коду) дізнатися про всі доступні ресурси, їхні поля та типи.

### А. Discovery (Перегляд списку доступних груп)

Ендпоінт `/openapi/v3` повертає список усіх груп API та версій, для яких доступні специфікації.

```bash
# Через проксі:
curl http://localhost:8080/openapi/v3

# Через curl прямо до API (використовуючи змінні з пункту 6):
curl --cacert ca.crt --cert developer.crt --key developer.key $KUBE_API/openapi/v3
```

### Б. Отримання схеми конкретної групи

На відміну від OpenAPI v2 (де все було в одному величезному файлі), у v3 ви отримуєте схеми частинами. Кожна частина відповідає певній групі API та версії (наприклад, `api/v1` або `apps/v1`).

```bash
# Отримання схеми для Core API (Pod, Service, ConfigMap тощо)
curl http://localhost:8080/openapi/v3/api/v1

# Отримання схеми для Apps API (Deployment, ReplicaSet)
curl http://localhost:8080/openapi/v3/apis/apps/v1

# Збереження у файл для аналізу (наприклад, через VS Code або онлайн редактори)
curl http://localhost:8080/openapi/v3/api/v1 > core_v1_openapi.json
```

### В. Навіщо це потрібно?

1.  **Генерація коду:** Ви можете згенерувати клієнтську бібліотеку для вашої мови програмування.
2.  **Валідація:** Інструменти можуть перевіряти ваші YAML-файли на відповідність схемі без звернення до "живого" кластера.
3.  **Документація:** Ви можете побачити всі можливі поля будь-якого об'єкта та їхні описи.

---

