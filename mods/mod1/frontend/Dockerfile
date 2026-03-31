FROM nginx:alpine

# Copy the static file as a template
COPY index.html.template /usr/share/nginx/html/index.html.template

# Command to substitute env variables and start nginx
CMD /bin/sh -c "envsubst '\$STUDENT_NAME \$STUDENT_GROUP \$STUDENT_COURSE' < /usr/share/nginx/html/index.html.template > /usr/share/nginx/html/index.html && exec nginx -g 'daemon off;'"
