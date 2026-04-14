#!/bin/bash

# 1. Створення приватного ключа
openssl genrsa -out developer.key 2048

# 2. Створення CSR
openssl req -new -key developer.key -out developer.csr -subj "/CN=developer/O=app-team"

# 3. Підготовка YAML для Kubernetes
cat <<EOF > csr.yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: developer-csr
spec:
  request: $(cat developer.csr | base64 | tr -d '\n')
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
EOF

echo "CSR створено у файлі csr.yaml. Виконайте: kubectl apply -f csr.yaml"
echo "Потім: kubectl certificate approve developer-csr"
echo "Потім отримайте сертифікат: kubectl get csr developer-csr -o jsonpath='{.status.certificate}' | base64 -d > developer.crt"
