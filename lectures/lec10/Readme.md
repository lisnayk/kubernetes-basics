# Лекція №10. Helm — менеджер пакетів для Kubernetes

У цій лекції ми розберемося, що таке Helm, навіщо він потрібен, як працюють чарти (Charts) та як автоматизувати розгортання складних додатків у Kubernetes.

## План лекції:
1. Що таке Helm та які проблеми він вирішує.
2. Основні поняття: Chart, Repository, Release.
3. Встановлення Helm.
4. Структура Helm Chart.
5. Робота з `values.yaml` та шаблонізація.
6. Життєвий цикл релізу (install, upgrade, rollback, uninstall).
7. Приклади встановлення та видалення популярних додатків (Nginx, Prometheus, MySQL).
8. Пошук готових рішень (Artifact Hub).

---

## 1. Що таке Helm?

**Helm** — це інструмент для керування пакетами в Kubernetes (аналог `apt` для Ubuntu або `npm` для Node.js). 

### Яку проблему він вирішує?
Коли ваш додаток росте, кількість YAML-маніфестів (Deployment, Service, Ingress, ConfigMap, Secret, HPA) збільшується. 
- **Дублювання коду:** Маніфести для `staging` та `production` майже однакові, окрім кількох параметрів (кількість реплік, доменне ім'я, ліміти ресурсів).
- **Складність оновлення:** Потрібно вручну редагувати багато файлів.
- **Відсутність версіонування:** Важко відкотитися до попередньої версії всього стеку додатків одночасно.

Helm дозволяє описати структуру додатка один раз у вигляді **шаблону (Template)** та підставляти туди різні **значення (Values)**.

---

## 2. Основні поняття

1. **Chart (Чарт)** — це пакет з усіма необхідними маніфестами для запуску додатка. Це набір файлів у певній структурі.
2. **Repository (Репозиторій)** — місце, де зберігаються та розповсюджуються чарти (наприклад, [Artifact Hub](https://artifacthub.io/)).
3. **Release (Реліз)** — конкретний екземпляр чарту, розгорнутий у кластері. Ви можете встановити один і той самий чарт кілька разів (наприклад, `mysql-dev` та `mysql-prod`), і це будуть два різні релізи.

---

## 3. Встановлення Helm

Helm — це просто один бінарний файл, але є кілька зручних способів його встановлення залежно від вашої ОС.

### А) Використання скрипту (Універсально для Linux/WSL/macOS)
Це найшвидший спосіб отримати останню стабільну версію:
```bash
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh
```

### Б) Менеджери пакетів
**Для macOS (Homebrew):**
```bash
brew install helm
```

**Для Linux (Ubuntu/Debian):**
```bash
curl https://baltocdn.com/helm/signing.asc | gpg --dearmor | sudo tee /usr/share/keyrings/helm.gpg > /dev/null
sudo apt-get install apt-transport-https --yes
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] https://baltocdn.com/helm/stable/debian/ all main" | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt-get update
sudo apt-get install helm
```

**Для Windows (Chocolatey або Winget):**
```powershell
choco install kubernetes-helm
# або
winget install Helm.Helm
```

### В) Встановлення бінарного файлу вручну
Ви можете завантажити потрібну версію зі сторінки [релізів Helm на GitHub](https://github.com/helm/helm/releases), розпакувати архів та перемістити бінарний файл `helm` у вашу папку `PATH` (наприклад, `/usr/local/bin/`).

### Перевірка встановлення
```bash
helm version
```

### Налаштування автодоповнення (Optional)
Для зручної роботи в терміналі (Bash):
```bash
echo "source <(helm completion bash)" >> ~/.bashrc
source ~/.bashrc
```

---

## 4. Структура Helm Chart

Створимо новий чарт для прикладу:
```bash
helm create my-app
```

Структура папки `my-app/`:
- `Chart.yaml` — метадані (назва, версія додатка, версія чарту).
- `values.yaml` — значення за замовчуванням для ваших шаблонів.
- `templates/` — папка з YAML-шаблонами.
  - `deployment.yaml`
  - `service.yaml`
  - `_helpers.tpl` — допоміжні функції для шаблонів.
- `charts/` — залежності (інші чарти, від яких залежить цей).

---

## 5. Робота з шаблонами та values.yaml

Усередині шаблонів використовується мова програмування **Go Templates**. 

Приклад `templates/deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-deploy
spec:
  replicas: {{ .Values.replicaCount }}
  ...
```

Приклад `values.yaml`:
```yaml
replicaCount: 3
image:
  repository: nginx
  tag: stable
```

Коли ви запускаєте `helm install`, Helm з'єднує шаблони зі значеннями та генерує фінальний YAML, який відправляється в Kubernetes API.

---

## 6. Основні команди (Життєвий цикл)

### Пошук та додавання репозиторіїв
```bash
# Додаємо офіційний репозиторій Bitnami (популярний для БД та інструментів)
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

### Встановлення (Install)
```bash
# Встановлюємо Redis з репозиторію bitnami під назвою 'my-cache'
helm install my-cache bitnami/redis
```

### Перегляд релізів (List)
```bash
helm list
```

### Оновлення (Upgrade)
Якщо ви змінили щось у `values.yaml` або хочете оновити версію:
```bash
helm upgrade my-cache bitnami/redis -f custom-values.yaml
```

### Відкат (Rollback)
Якщо щось пішло не так:
```bash
helm rollback my-cache 1  # Повернутися до ревізії №1
```

### Видалення (Uninstall)
Команда `uninstall` видаляє всі ресурси, пов'язані з релізом:
```bash
helm uninstall my-cache
```

---

## 7. Приклади встановлення та зупинки популярних додатків

Helm дозволяє швидко розгорнути складні інструменти однією-двома командами.

### А) Nginx Ingress Controller
Це стандартний інструмент для керування зовнішнім трафіком у кластері.
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install my-ingress ingress-nginx/ingress-nginx
```

### Б) Prometheus (Моніторинг)
Потужна система збору метрик.
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install my-prometheus prometheus-community/prometheus
```

### В) MySQL (База даних)
Популярна реляційна база даних.
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-db bitnami/mysql --set auth.rootPassword=strongpassword
```

### Як зупинити та видалити ці додатки?
Щоб повністю зупинити додаток та звільнити ресурси в кластері, використовується команда `uninstall`:
```bash
# Видалення Ingress-контролера
helm uninstall my-ingress

# Видалення Prometheus
helm uninstall my-prometheus

# Видалення MySQL (Увага: за замовчуванням PersistentVolume може залишитися!)
helm uninstall my-db
```
Зверніть увагу, що після `helm uninstall` дані в базах даних (PVC) можуть зберігатися залежно від налаштувань `ReclaimPolicy`.

---

## 8. Практична вправа

1. Створіть свій чарт: `helm create hello-helm`.
2. Змініть у `values.yaml` кількість реплік на 2.
3. Встановіть його у свій кластер: `helm install demo hello-helm`.
4. Перевірте статус подів: `kubectl get pods`.
5. Спробуйте видалити реліз: `helm uninstall demo`.

---

## Корисні посилання
- [Офіційна документація Helm](https://helm.sh/docs/)
- [Artifact Hub](https://artifacthub.io/) — пошук готових чартів.
