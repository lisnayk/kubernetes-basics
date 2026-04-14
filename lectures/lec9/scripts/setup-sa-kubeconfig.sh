#!/bin/bash

# Налаштування змінних
SA_NAME="build-robot"
NAMESPACE="development"
CONTEXT_NAME="sa-context"
USER_NAME="sa-user"

echo "--- Налаштування контексту для ServiceAccount: $SA_NAME ---"

# 1. Перевірка наявності SA
if ! kubectl get sa $SA_NAME -n $NAMESPACE &> /dev/null; then
    echo "Помилка: ServiceAccount $SA_NAME не знайдено в неймспейсі $NAMESPACE."
    exit 1
fi

# 2. Отримання токена
echo "Генерація токена..."
TOKEN=$(kubectl create token $SA_NAME -n $NAMESPACE --duration=24h)

# 3. Отримання імені кластера
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')
echo "Використання кластера: $CLUSTER_NAME"

# 4. Налаштування користувача в kubeconfig
kubectl config set-credentials $USER_NAME --token=$TOKEN

# 5. Налаштування контексту
kubectl config set-context $CONTEXT_NAME \
    --cluster=$CLUSTER_NAME \
    --user=$USER_NAME \
    --namespace=$NAMESPACE

echo "--- Готово! ---"
echo "Для перемикання на новий контекст виконайте:"
echo "kubectl config use-context $CONTEXT_NAME"
echo ""
echo "Для перевірки прав:"
echo "kubectl auth can-i get pods"
