FROM nginx:alpine
COPY www/* /usr/share/nginx/html/
COPY audio/* /usr/share/nginx/html/
