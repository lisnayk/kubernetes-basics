```shell
kubectl create namespace lec2
kubectl get namespaces
kubectl config set-context --current --namespace=lec2
kubectl config view --minify | grep namespace: 
kubectl config view
# dry run 
kubectl run nginx-app --image=nginx --port=80 --dry-run=client -o yaml > nginx-app-pod.yaml
kubectl apply -f nginx-app-pod.yaml 
kubectl port-forward pod/nginx-app 8080:80
kubectl exec -it nginx-app -- bash

kubectl apply -f multi-container-app-pod.yaml 
kubectl port-forward pod/multi-container-app 8080:80
kubectl delete -f multi-container-app-pod.yaml

kubectl apply -f nginx-test-app-pod.yaml
kubectl port-forward pod/multi-container-app 8080:80


docker build -t ubuntu-nginx-htop:1.0 .
docker tag ubuntu-nginx-htop:1.0 munspel/ubuntu-nginx-htop:1.0
docker tag ubuntu-nginx-htop:1.0 munspel/ubuntu-nginx-htop:latest
docker push munspel/ubuntu-nginx-htop:latest
docker push munspel/ubuntu-nginx-htop:1.0

 kubectl top pod nginx-test-app
```

- https://manpages.ubuntu.com/manpages/jammy/man1/stress.1.html
