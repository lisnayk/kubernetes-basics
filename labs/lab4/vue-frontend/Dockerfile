FROM nginx:alpine

# Copy the static file as a template
COPY index.html /usr/share/nginx/html/index.html.template

# Command to substitute env variables and start nginx
CMD /bin/sh -c "envsubst '\$APP_TITLE \$APP_ENV \$DOCS_URL \$APP_BG_COLOR' < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html && exec nginx -g 'daemon off;'"
