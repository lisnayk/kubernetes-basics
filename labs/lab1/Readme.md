# Лабораторна робота №1. Розгортання локального Kubernetes-кластера

---

## Мета

Метою даного заняття є формування у студентів цілісного розуміння ролі компонента **kubelet** у архітектурі Kubernetes, а також набуття практичних навичок локального розгортання Kubernetes-кластера з використанням різних дистрибутивів.

---

## Теоретичні матеріали

### 1. Вступ

Kubernetes — це платформа оркестрації контейнерів, яка складається з набору взаємоповʼязаних компонентів. Одним із ключових компонентів на рівні вузла є **kubelet**. Саме він забезпечує фактичне виконання контейнерів і Podʼів, описаних у Kubernetes API.

Локальне розгортання Kubernetes використовується для навчання, тестування та розробки. Воно дозволяє працювати з Kubernetes без потреби у хмарній або серверній інфраструктурі.

---

### 2. Kubelet

**Kubelet** — це агент Kubernetes, який запускається на кожному вузлі кластера.

Основні функції kubelet:

- отримання опису Podʼів з Kubernetes API Server;
- взаємодія з контейнерним runtime (containerd, CRI-O тощо);
- запуск, зупинка та перезапуск контейнерів;
- моніторинг стану Podʼів і контейнерів;
- виконання liveness, readiness та startup probe;
- звітування про стан вузла до API Server.

Ключові особливості:

- kubelet працює **лише в межах одного вузла**;
- не приймає рішень про розміщення Podʼів;
- реалізує бажаний стан, описаний у Kubernetes.

---

### 3. Kubelet у локальних Kubernetes-кластерах

У локальних дистрибутивах Kubernetes kubelet зазвичай встановлюється та налаштовується автоматично. Це дозволяє зосередитись на вивченні логіки Kubernetes, а не на складних аспектах початкового налаштування.

Незважаючи на спрощення, kubelet у локальних кластерах виконує ті самі функції, що і в production-середовищах.

---

### 4. Варіанти локального встановлення Kubernetes

Для локального розгортання Kubernetes найбільш поширеними є такі варіанти:

- **Minikube**
- **Kind (Kubernetes in Docker)**
- **K3s**
- **MicroK8s**

---

### 5. Порівняльна таблиця варіантів локального встановлення

| Критерій | Minikube | Kind | K3s | MicroK8s |
|--------|---------|------|-----|----------|
| Тип розгортання | VM або Docker | Docker | Бінарний | Snap |
| Вимоги до ресурсів | Середні | Низькі | Дуже низькі | Низькі |
| Простота встановлення | Висока | Висока | Середня | Висока |
| Підтримка multi-node | Так | Так | Так | Так |
| Близькість до production | Середня | Середня | Висока | Середня |
| Контейнерний runtime | containerd / Docker | containerd | containerd | containerd |
| Платформи | Windows / macOS / Linux | Windows / macOS / Linux | Linux | Linux |

---

### 6. Коротка характеристика рішень

**Minikube** — універсальний інструмент для навчання та першого знайомства з Kubernetes.

**Kind** — швидке та легке рішення для тестування Kubernetes у Docker-середовищі.

**K3s** — lightweight-дистрибутив, орієнтований на production та edge-сценарії.

**MicroK8s** — компактний Kubernetes від Canonical з модульною системою розширень.

---

### Встановленн Kubectl 

В ОС Windows Щоб встановити kubectl у Windows, ви можете скористатися менеджером пакетів Chocolatey , інсталятором командного рядка Scoop або менеджером пакетів winget.
```shell
winget install -e --id Kubernetes.kubectl
```
Для ОС Linux встановлення здійснюється за допомогою менеджера пакетів:
```shell
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check   
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```
Перевірте, чи встановлена вами версія актуальна:

```shell
kubectl version --client
```

#### Отримання інформації про кластер

| Команда | Опис                                            |
|---------|-------------------------------------------------|
| `kubectl cluster-info` | Інформація про API Server та основні endpoint-и |
| `kubectl cluster-info dump` | Повний dump стану кластера                      |
| `kubectl version` | Версія клієнта і сервера                        |
| `kubectl get nodes` | Список нод кластера                             |
| `kubectl describe node <name>` | Детальна інформація про ноду                    |
| `kubectl get componentstatuses` | Статус компонентів control-plane (застаріває)   |
| `kubectl api-resources` | Доступні типи ресурсів                          |
| `kubectl api-versions` | Версії API                                      |

---

#### Робота з kubeconfig (підключення до кластерів)

| Команда | Опис                               |
|---------|------------------------------------|
| `kubectl config view` | Показати весь kubeconfig           |
| `kubectl config current-context` | Поточний контекст                  |
| `kubectl config get-contexts` | Список контекстів                  |
| `kubectl config use-context <name>` | Переключити кластер                |
| `kubectl config delete-context <name>` | Видалити контекст                  |
| `kubectl config set-context --current --namespace=dev` | Змінити namespace за замовчуванням |

---

**Контекст** — це набір налаштувань, що визначає:

1. **Cluster (кластер)** — адреса API-сервера та сертифікати для підключення.
2. **User (користувач)** — credentials: токен, сертифікати або інші методи аутентифікації.
3. **Namespace (простір імен)** — область, у якій виконуються команди за замовчуванням.

> Контекст визначає **куди і під ким ви працюєте** у кластері Kubernetes.

У файлі kubeconfig можна мати багато контекстів: наприклад, для `docker-desktop`, `dev-cluster` і `prod-cluster`.
Для додавання нового кластера вручну

```bash
# Переглянути всі контексти
kubectl config get-contexts

# Переключитися на Docker Desktop Kubernetes
kubectl config use-context docker-desktop

# Подивитися поточний контекст
kubectl config current-context

# Змінити namespace за замовчуванням
kubectl config set-context --current --namespace=default

# Перевірити підключення до кластера
kubectl get nodes
```

## Завдання

1. Обрати **щонайменше два** варіанти локального встановлення Kubernetes з наведеного списку.
2. Виконати встановлення обраних дистрибутивів.
3. Встановити та налаштувати `kubectl`.
4. Вівести перелік доступних контекстів.
5. Підлючитися до кожного з контекстів та вивести по ним інформацію `kubectl cluster-info` та інформацію про доступні ноди `kubectl get nodes`
6. Запустити тестовий Pod (`VENDOR` - ваш пріхвище англійскою)
   ```shell
   kubectl run nginx-<VENDOR> --image=nginx
   kubectl get pods
   kubectl logs nginx-<VENDOR>
   kubectl delete pod nginx-<VENDOR>
   ```
   
7. Результати виконання всіх команд відобразити в звіті.
8. Порівняти обрані варіанти локального встановлення та описати результати у короткому звіті.

---

## Контрольні питання

- Що таке **kubelet** і яка його роль у Kubernetes-кластері?
- Які основні функції kubelet на вузлі кластера?
- Чим kubelet відрізняється від scheduler та controller-manager?
- Назвіть і коротко охарактеризуйте чотири варіанти локального встановлення Kubernetes: Minikube, Kind, K3s, MicroK8s.
- Який варіант локального встановлення підходить для легких тестів у Docker середовищі?
- Що таке **контекст** у Kubernetes і які компоненти він об’єднує?
- Як переглянути поточний контекст та список доступних контекстів у kubectl?
- Як переключити kubectl на інший контекст?
- Як змінити namespace за замовчуванням у поточному контексті?
- Які команди дозволяють отримати інформацію про кластер та ноди?
- Як створити простий Pod з образом Nginx за допомогою kubectl?
- Як переглянути логи Pod?
- Як видалити Pod?
- Як перевірити версію kubectl та актуальність встановленого клієнта?

# Користні посилання

- https://kubernetes.io/docs/tasks/tools/install-kubectl-windows/
- https://kubernetes.io/docs/tasks/tools/