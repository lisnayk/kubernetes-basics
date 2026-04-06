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

## 3. RBAC (Role-Based Access Control)

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

## 4. Сценарії використання

### Сценарій А: Читання подів у своєму Namespace (Role)
Використовується для моніторингових додатків, які працюють лише в межах однієї команди/проекту.

### Сценарій Б: Управління вузлами або логами всього кластера (ClusterRole)
Використовується для системних утиліт, операторів або Ingress-контролерів.

---

## 5. Безпека та Best Practices

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
