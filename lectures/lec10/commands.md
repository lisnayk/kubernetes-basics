# Команди до лекції №10: Helm

## Встановлення
```bash
# Швидке встановлення скриптом
curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
chmod 700 get_helm.sh
./get_helm.sh

# Перевірка версії
helm version

# Налаштування автодоповнення (Bash)
helm completion bash > /etc/bash_completion.d/helm
```

## Робота з репозиторіями
```bash
# Додати репозиторій
helm repo add bitnami https://charts.bitnami.com/bitnami

# Оновити список чартів у репозиторіях
helm repo update

# Пошук чарту
helm search repo redis
```

## Керування релізами
```bash
# Встановлення чарту
helm install my-redis bitnami/redis

# Перегляд встановлених релізів
helm list

# Перегляд статусу конкретного релізу
helm status my-redis

# Оновлення релізу (зміна конфігурації)
helm upgrade my-redis bitnami/redis --set replicaCount=3

# Перегляд історії ревізій
helm history my-redis

# Відкат до попередньої версії
helm rollback my-redis 1

# Видалення релізу
helm uninstall my-redis
```

## Приклади популярних додатків

### Nginx Ingress Controller
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install my-ingress ingress-nginx/ingress-nginx
```

### Prometheus
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install my-prometheus prometheus-community/prometheus
```

### MySQL
```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install my-db bitnami/mysql --set auth.rootPassword=strongpassword
```

### Видалення та зупинка (Stop)
```bash
helm uninstall my-ingress
helm uninstall my-prometheus
helm uninstall my-db
```

## Створення та розробка чартів
```bash
# Створення структури нового чарту
helm create my-webapp

# Перевірка чарту на помилки (Linting)
helm lint ./my-webapp

# Тестова генерація маніфестів без встановлення (Dry Run)
helm install demo ./my-webapp --dry-run --debug
```
