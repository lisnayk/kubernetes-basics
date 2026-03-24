#!/bin/sh
cat <<EOF > /usr/share/nginx/html/config.js
window.APP_TITLE = "${APP_TITLE:-Product Catalog}";
window.APP_ENV = "${APP_ENV:-production}";
window.STUDENT_FIO = "${STUDENT_FIO:-Student}";
window.STUDENT_GROUP = "${STUDENT_GROUP:-Group}";
EOF

# Inject config into index.html
sed -i 's/<\/head>/<script src="\/config.js"><\/script><\/head>/' /usr/share/nginx/html/index.html

exec "$@"
