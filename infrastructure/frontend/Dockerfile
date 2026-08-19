FROM nginx:1.27-alpine

COPY infrastructure/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html
COPY assets /usr/share/nginx/html/assets

EXPOSE 8080

HEALTHCHECK --interval=5s --timeout=2s --retries=10 --start-period=2s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz
