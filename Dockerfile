FROM swr.zhydc-nyyjy-1.r410.cnooc/cnooc-gongyinglian/nginx_kylin:1.22.0

# 数智展厅前端：Nginx 托管 Vite 构建产物 dist
RUN mkdir /dist/
ADD dist /dist/
ADD ./nginx.conf /
RUN chmod -R 777 /dist/

ENTRYPOINT ["/usr/sbin/nginx", "-c", "/nginx.conf"]
