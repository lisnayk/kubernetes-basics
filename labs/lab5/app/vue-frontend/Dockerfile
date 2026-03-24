FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
RUN echo 'window.APP_TITLE = "${APP_TITLE}";' > /usr/share/nginx/html/config.js
RUN echo 'window.APP_ENV = "${APP_ENV}";' >> /usr/share/nginx/html/config.js

# Note: We will use envsubst in a real scenario, but for simplicity we can use a script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
