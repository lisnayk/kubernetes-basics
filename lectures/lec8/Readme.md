# Лекція №8. Kubernetes API та RBAC (Role-Based Access Control)

## 1. Kubernetes API Server: Серце кластера

Kubernetes API Server (`kube-apiserver`) — це центральний компонент управління. Будь-яка взаємодія з кластером (через `kubectl`, UI або внутрішні компоненти) відбувається через HTTP-запити до цього сервера.

### Процес обробки запиту:
1.  **Authentication (Автентифікація)**: Хто ви такий? (Token, Certificate, OIDC).
2.  **Authorization (Авторизація)**: Чи маєте ви право виконувати цю дію? (RBAC, ABAC).
3.  **Admission Control**: Чи відповідає ваш запит правилам кластера? (Quota, PodSecurity).
4.  **Validation & Persistence**: Перевірка синтаксису та збереження стану в `etcd`.

---

## 2. ServiceAccounts: "Особи" для програм

У той час як користувачі (Users) — це люди, **ServiceAccounts** призначені для процесів, що запущені всередині Pod-ів.

- Кожен Namespace має `default` ServiceAccount.
- Токен ServiceAccount автоматично монтується в Pod за шляхом `/var/run/secrets/kubernetes.io/serviceaccount/token`.
- Бібліотеки (наприклад, `@kubernetes/client-node` або `client-go`) використовують цей токен для автентифікації запитів до API.

---

## 3. Механізми авторизації (Authorization Mechanisms)

Коли Kubernetes зрозумів, "Хто ви" (Автентифікація), він має вирішити, "Що вам дозволено" (Авторизація). В K8s є кілька способів це перевірити:

1.  **RBAC (Role-Based Access Control) — Основний:**
    *   **Логіка:** Дозволи даються на основі "Ролі" (наприклад, "Адмін", "Розробник", "Глядач").
    *   **Плюс:** Дуже гнучкий, стандарт для 99% випадків.

2.  **ABAC (Attribute-Based Access Control):**
    *   **Логіка:** Дозволи базуються на атрибутах (наприклад, "Якщо користувач Іван Іванович і зараз вівторок, то можна видаляти поди").
    *   **Детальніше:**
        *   **Політики:** Описуються у спеціальному JSON-файлі (наприклад, `policy.jsonl`), де кожен рядок — це окреме правило.
        *   **Атрибути:** Система перевіряє: *Хто?* (user/group), *З яким ресурсом?* (pod/namespace), *Яка дія?* (get/list), *Чи це не-ресурсний шлях?* (наприклад, `/healthz`).
        *   **Приклад правила:** `{"apiVersion": "abac.authorization.kubernetes.io/v1beta1", "kind": "Policy", "spec": {"user": "alice", "namespace": "project-a", "resource": "pods", "readonly": true}}` (дозволяє Alice тільки читати поди в project-a).
    *   **Налаштування:** Щоб увімкнути ABAC, потрібно запустити `kube-apiserver` з прапорцями `--authorization-mode=ABAC` та `--authorization-policy-file=path/to/policy.jsonl`.
    *   **Мінус:** Будь-яка зміна потребує редагування файлу на сервері та часто перезапуску API (хоча новіші версії можуть перечитувати файл), що робить його незручним у динамічному середовищі порівняно з RBAC.

3.  **Node Authorization:**
    *   **Логіка:** Спеціальний режим для `kubelet` (агентів на нодах). Він дозволяє ноді керувати тільки своїми подами, секретами та мережею, щоб зламана нода не могла зашкодити всьому кластеру.

4.  **Webhook:**
    *   **Логіка:** Kubernetes "дзвонить" сторонній програмі (сервісу) і запитує: "Слухай, тут користувач хоче видалити базу даних, можна?".
    *   **Плюс:** Дозволяє створювати складні зовнішні перевірки.

---

## 4. Режими авторизації (Authorization Modes)

У Kubernetes ви можете активувати кілька механізмів авторизації одночасно. Це робиться за допомогою прапорця `--authorization-mode` у налаштуваннях `kube-apiserver`.

### Як це працює (Ланцюжок перевірок):
1.  **Пріоритетність:** Коли приходить запит, API Server перевіряє його через модулі авторизації у тому порядку, в якому вони вказані у прапорці (наприклад: `Node,RBAC,Webhook`).
2.  **Принцип "Першого дозволу":**
    *   Якщо якийсь модуль **дозволяє** запит — перевірка припиняється, доступ надано.
    *   Якщо модуль **не знає** (не має правила) — запит передається наступному модулю.
    *   Якщо **всі** модулі не дозволили запит — повертається помилка `403 Forbidden`.

### Доступні режими:
- **RBAC**: Використовує об'єкти `Role` та `RoleBinding`. Стандарт де-факто.
- **ABAC**: Використовує файл з політиками на диску.
- **Node**: Спеціальна авторизація для вузлів (kubelet).
- **Webhook**: Надсилає запит на зовнішній HTTP-ендпоінт.
- **AlwaysAllow**: Дозволяє все (небезпечно, тільки для тестів).
- **AlwaysDeny**: Забороняє все (тільки для тестів).

### Приклад налаштування:
```bash
# У файлі маніфесту kube-apiserver (/etc/kubernetes/manifests/kube-apiserver.yaml)
--authorization-mode=Node,RBAC
```
Це означає: спочатку перевіряємо, чи це запит від ноди (Node), якщо ні — перевіряємо через ролі (RBAC).

### Крок 4. Локальне тестування через `kubectl proxy` (HTTP-сервер)

Якщо ви хочете досліджувати API без ручного налаштування сертифікатів або токенів, ви можете запустити локальний проксі-сервер:

```bash
kubectl proxy --port=8080
```

Тепер API доступне за адресою `http://localhost:8080`. Це дозволяє:
- **Переглядати ресурси:** `curl http://localhost:8080/api/v1/pods`
- **Досліджувати схеми:** `curl http://localhost:8080/openapi/v3/api/v1`
- **Тестувати запити:** Використовувати браузер або Postman для перегляду JSON-відповідей.

---

## 5. RBAC (Role-Based Access Control) в деталях

RBAC дозволяє гнучко налаштовувати права доступу на основі ролей.

### Основні ресурси RBAC:

| Ресурс | Опис | Область дії |
| :--- | :--- | :--- |
| **Role** | Визначає дозволи (дієслова + ресурси). | Namespace |
| **ClusterRole** | Те саме, але для всього кластера або не-namespace ресурсів. | Cluster |
| **RoleBinding** | Зв'язує Role з суб'єктом (User, Group, ServiceAccount). | Namespace |
| **ClusterRoleBinding** | Зв'язує ClusterRole з суб'єктом для всього кластера. | Cluster |

### Елементи Role (Правила):
- **apiGroups**: Назва API групи (порожньо "" для основної групи `v1`).
- **resources**: Тип ресурсу (`pods`, `services`, `deployments`, `secrets`).
- **verbs**: Дії (`get`, `list`, `watch`, `create`, `update`, `patch`, `delete`).

---

## 6. Сценарії використання

### Сценарій А: Читання подів у своєму Namespace (Role)
Використовується для моніторингових додатків, які працюють лише в межах однієї команди/проекту.

### Сценарій Б: Управління вузлами або логами всього кластера (ClusterRole)
Використовується для системних утиліт, операторів або Ingress-контролерів.

---

## 7. Як перевірити поточний Authorization Mode?

Якщо у вас є доступ до вузла з `control-plane`, ви можете перевірити налаштування `kube-apiserver`:

```bash
# Перегляд конфігурації статичного поду API сервера
kubectl get pod kube-apiserver-kind-control-plane -n kube-system -o yaml | grep authorization-mode
```

---

## 8. Безпека та Best Practices

1.  **Принцип найменших привілеїв (Least Privilege)**: Не давайте `cluster-admin` там, де достатньо `view`.
2.  **Уникайте використання `default` ServiceAccount**: Створюйте окремі SA для кожного додатка.
3.  **Регулярний аудит**: Перевіряйте, які права мають ваші ServiceAccounts за допомогою `kubectl auth can-i`.
4.  **AutomountServiceAccountToken**: Якщо додатку не потрібен доступ до API, вимкніть автоматичне монтування токена в маніфесті Pod (`automountServiceAccountToken: false`).

---

## Корисні команди для перевірки прав

```bash
# Перевірка, чи може поточний користувач створювати поди
kubectl auth can-i create pods

# Перевірка прав для конкретного ServiceAccount
kubectl auth can-i list secrets --as=system:serviceaccount:default:my-sa

# Перегляд усіх зв'язків ролей у кластері
kubectl get rolebindings,clusterrolebindings -A
```

---

## Додаткові матеріали
- [Kubernetes RBAC Documentation](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Service Accounts Guide](https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/)
- [Kubernetes API Reference](https://kubernetes.io/docs/reference/kubernetes-api/)
