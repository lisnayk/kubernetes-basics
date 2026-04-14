#!/bin/bash

# Скрипт для повернення до основного контексту та очищення створених конфігурацій

# 1. Знаходимо основний контекст (зазвичай це kind-kind)
# Якщо ви використовуєте інший кластер, замініть ім'я
DEFAULT_CONTEXT="kind-kind"

echo "Перемикання на основний контекст: $DEFAULT_CONTEXT"
kubectl config use-context $DEFAULT_CONTEXT

# 2. Видалення тимчасових контекстів
echo "Видалення тимчасових контекстів..."
kubectl config delete-context sa-context 2>/dev/null

# 3. Видалення тимчасових користувачів
echo "Видалення тимчасових користувачів..."
kubectl config delete-user build-robot-user 2>/dev/null
kubectl config delete-user dev-user 2>/dev/null

echo "Очищення завершено. kubectl повернуто до дефолтного стану."
