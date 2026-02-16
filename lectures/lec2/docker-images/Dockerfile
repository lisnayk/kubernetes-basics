FROM ubuntu:latest
RUN apt update && \
    apt install -y nginx htop stress curl && \
    apt clean

RUN echo "<h1>Kubernetes stress-test demo Server</h1>" > /var/www/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]