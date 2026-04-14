# Лекція №9. Практичне застосування RBAC (Role-Based Access Control)

У цій лекції ми навчимося створювати нових користувачів у Kubernetes, обмежувати їхні права за допомогою `Role` та `ClusterRole`, а також перевіряти ці права за допомогою `kubectl`.

## План лекції:
0. Робота з контекстами та користувачами (Preparation).
1. Створення сертифікатів для нового користувача (`developer`).
2. Додавання користувача до `kubeconfig`.
3. Створення та оновлення `Role` та `RoleBinding`.
4. Створення та використання `ServiceAccount`.
5. Як додати ServiceAccount до Pod.
6. Як перевірити використання ServiceAccount в Pod.
7. Створення та використання токенів (TokenRequest API vs Secrets).
8. Пряма взаємодія з API (curl).
9. Створення та оновлення `ClusterRole` для всього кластера.
10. Перевірка прав доступу (`kubectl auth can-i`).
11. Повернення до початкового стану та очищення.

---

## 0. Робота з контекстами та користувачами (Preparation)

Перш ніж змінювати налаштування доступу, важливо знати, в якому контексті ви працюєте та які користувачі доступні. Контекст — це поєднання кластера, користувача та неймспейсу.

```bash
# Поточний контекст
kubectl config current-context

# Список всіх доступних контекстів
kubectl config get-contexts

# Список користувачів у вашому kubeconfig
kubectl config get-users

# Список системних облікових записів (ServiceAccounts)
kubectl get sa -A
```

---

## 1. Створення користувача (Authentication)

Kubernetes не має вбудованого ресурсу `User`. Зазвичай користувачі ідентифікуються за допомогою зовнішніх систем або X.509 сертифікатів.

### Генерація ключа та CSR (Certificate Signing Request)
Ми створимо користувача `developer`, який належатиме до групи `app-team`.

```bash
# Створення приватного ключа
openssl genrsa -out developer.key 2048

# Створення запиту на сертифікат (CN = ім'я користувача, O = назва групи)
openssl req -new -key developer.key -out developer.csr -subj "/CN=developer/O=app-team"
```

Далі цей CSR потрібно надіслати в Kubernetes для підпису (файл `k8s/csr.yaml`).
Потім адміністратор має схвалити запит: `kubectl certificate approve developer-csr`.
Після чого можна отримати сертифікат: `kubectl get csr developer-csr -o jsonpath='{.status.certificate}' | base64 -d > developer.crt`.

---

## 2. Додавання користувача до `kubeconfig`

Після отримання сертифіката (`developer.crt`) та ключа (`developer.key`), додайте їх до конфігурації `kubectl`:

```bash
# Додаємо користувача
kubectl config set-credentials developer --client-certificate=developer.crt --client-key=developer.key

# Створюємо контекст
kubectl config set-context developer-context --cluster=kind-kind --user=developer

# Використання контексту
kubectl config use-context developer-context
```

---

## 3. Обмеження доступу (Authorization)

### Сценарій: Доступ тільки до Pods у Namespace `development`

1. **Role**: Визначає, що можна робити (get, list, watch) і з чим (pods).
2. **RoleBinding**: Прив'язує користувача `developer` до цієї ролі.

Дивіться файли у папці `k8s/`:
- `k8s/role.yaml`
- `k8s/role-binding.yaml`

### Як оновлювати Roles та RoleBindings?

Найкращий спосіб — через маніфести (GitOps style):
1. Відредагуйте файл `k8s/role.yaml`.
2. Виконайте: `kubectl apply -f k8s/role.yaml`.

Якщо потрібно швидко внести зміни в кластері:
`kubectl edit role pod-reader -n development`

---

## 3. ServiceAccounts (Для програм)

На відміну від користувачів, `ServiceAccount` — це внутрішні об'єкти Kubernetes, які використовуються процесами всередині Pod-ів.

### Чому SA кращі за токени користувачів для програм?
- Вони обмежені неймспейсом.
- Їх легко створювати та видаляти через YAML.
- Токени автоматично монтуються у Pod.

Файл `k8s/sa.yaml` містить опис `ServiceAccount` та прив'язку до ролі `pod-reader`.

---

## 4. Як додати ServiceAccount до Pod?

Щоб контейнери всередині Pod-а могли використовувати права, надані `ServiceAccount`, його потрібно вказати в специфікації Pod-а за допомогою поля `serviceAccountName`.

### Приклад YAML (k8s/pod-with-sa.yaml):
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: sa-test-pod
  namespace: development
spec:
  serviceAccountName: build-robot  # Вказуємо ім'я нашого SA
  containers:
  - name: alpine
    image: alpine
    command: ["sleep", "3600"]
```

### Що відбувається після запуску?
1. Kubernetes автоматично монтує токен `ServiceAccount` у папку `/var/run/secrets/kubernetes.io/serviceaccount/` всередині контейнера.
2. Програми (наприклад, `kubectl` або клієнтські бібліотеки) можуть читати цей токен для автентифікації в API-сервері.
3. Якщо `serviceAccountName` не вказано, використовується обліковий запис `default` з мінімальними правами.

---

## 5. Як перевірити використання ServiceAccount в Pod?

Після запуску Pod-а важливо переконатися, що він дійсно використовує потрібний `ServiceAccount` і має доступ до API.

### 1. Перевірка через `kubectl describe`
Ви можете побачити, який SA призначено поду та куди змонтовано токен:
```bash
kubectl describe pod sa-test-pod -n development
```
Шукайте поле `Service Account:` та розділ `Mounts:`, де має бути шлях `/var/run/secrets/kubernetes.io/serviceaccount`.

### 2. Перевірка файлів всередині контейнера
Ви можете зайти в контейнер і перевірити наявність токена:
```bash
kubectl exec sa-test-pod -n development -- ls /var/run/secrets/kubernetes.io/serviceaccount/
```
Там мають бути файли: `token`, `namespace` та `ca.crt`.

### 3. Перевірка прав (WhoAmI)
Найкращий спосіб перевірити, чи працює токен — спробувати виконати запит до API з самого поду. Якщо в образі є `curl`:
```bash
kubectl exec sa-test-pod -n development -- curl -v -k https://kubernetes.default/api/v1/namespaces/development/pods
```

---

## 6. Доступ через токени (Authentication)

З версії Kubernetes 1.24+ токени для `ServiceAccount` більше не створюються автоматично у вигляді `Secret`. Тепер є два основних способи отримати токен:

### Спосіб А: Тимчасовий токен (Рекомендовано)
Цей токен має обмежений термін дії і видається через `TokenRequest API`.
```bash
kubectl create token build-robot -n development --duration=1h
```

### Спосіб Б: Статичний токен (Legacy / CI/CD)
Якщо вам потрібен постійний токен (наприклад, для GitHub Actions), його потрібно створити вручну як `Secret` з анотацією.
Дивіться `k8s/token-secret.yaml`.

### Додавання ServiceAccount у Kubeconfig
Щоб використовувати `ServiceAccount` як звичайний контекст у `kubectl`, його потрібно додати у файл конфігурації:

1. **Отримайте токен:** `TOKEN=$(kubectl create token build-robot -n development)`
2. **Створіть користувача:** `kubectl config set-credentials build-robot-user --token=$TOKEN`
3. **Створіть контекст:** `kubectl config set-context build-robot-context --cluster=kind-kind --user=build-robot-user --namespace=development`
4. **Перемкніться на контекст:** `kubectl config use-context build-robot-context`

---

## 5. Пряма взаємодія з API (Authentication)

Хоча ми зазвичай використовуємо `kubectl`, важливо розуміти, як працювати з API безпосередньо.

### Чому це важливо?
- Написання власних скриптів/інструментів.
- Робота з API всередині додатків (через SDK або HTTP).
- Розуміння того, як `kubectl` спілкується з сервером.

Детальні приклади команд `curl` дивіться у файлі `commands.md`.

---

## 9. Повернення до початкового стану та очищення

Після того, як ви навчилися створювати нові контексти та працювати від імені `ServiceAccount`, необхідно повернути налаштування `kubectl` у дефолтний стан (контекст адміністратора) та видалити тимчасові об'єкти.

```bash
# Перевірка поточного контексту
kubectl config current-context

# Повернення до основного контексту (наприклад, kind-kind)
kubectl config use-context kind-kind

# Очищення (видалення створеного контексту та користувача)
kubectl config delete-context sa-context
kubectl config delete-user build-robot-user
```

Це дозволяє продовжити роботу з повними правами адміністратора кластера та тримати ваш `kubeconfig` у чистоті.

---

## 7. ClusterRole та ClusterRoleBinding

На відміну від `Role`, `ClusterRole` дозволяє надавати права на рівні всього кластера (наприклад, перегляд нод або доступ до всіх неймспейсів).

Дивіться приклад у `k8s/cluster-role.yaml`.

---

## 8. Перевірка прав доступу (`kubectl auth can-i`)














































































