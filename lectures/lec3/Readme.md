# Examples from lecture 3

```bash
cd rs
kubectl apply -f frontend.yaml
kubectl get rs
# You can also check on the state of the ReplicaSet:
kubectl describe rs/frontend

kubectl get pods

NAME             READY   STATUS    RESTARTS   AGE
frontend-9zbdz   1/1     Running   0          2m16s
frontend-jj9xc   1/1     Running   0          2m16s
frontend-mpcxq   1/1     Running   0          2m16s

kubectl get pods frontend-9zbdz -o yaml
...
metadata:
  creationTimestamp: "2026-02-23T19:34:19Z"
  generateName: frontend-
  labels:
    tier: frontend
  name: frontend-9zbdz
  namespace: default
  ownerReferences:
  - apiVersion: apps/v1
    blockOwnerDeletion: true
    controller: true
    kind: ReplicaSet
    name: frontend
    uid: 7a5e9392-188f-416f-bf53-161f94dca011
  resourceVersion: "453612"
  uid: 42e8dd1a-4d94-48a9-9633-977ae2a57c1c
...

kubectl delete rs/frontend
kubectl get pods
# No frontend pods are running.
kubectl apply -f pod.yaml 
kubectl apply -f frontend.yaml  
kubectl get pods
kubectl exec -it pod1 -- bash

# Restarts demo
stress --vm 2 --vm-bytes 32M
# Delete pod
kubectl delete pod/pod1
# Check pod status
kubectl get pods
# Scale up
kubectl scale rs frontend --replicas=5
kubectl edit rs frontend 

#DEPLOYMENT
kubectl apply -f nginx-deployment.yaml 
kubectl get deployment nginx-deployment
kubectl get pods
ubectl get rs
kubectl set image deployment.apps/nginx-deployment nginx=nginx:1.16.1
deployment.apps/nginx-deployment image 

kubectl rollout status deployment/nginx-deployment

kubectl rollout history deployment/nginx-deployment
kubectl rollout history deployment/nginx-deployment --revision=3
kubectl rollout undo deployment/nginx-deployment
kubectl get deployment nginx-deployment
kubectl describe  deployment nginx-deployment
kubectl scale deployment/nginx-deployment --replicas=10
```


