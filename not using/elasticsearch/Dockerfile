FROM elasticsearch:8.13.0
#RUN curl -u elastic:${ELASTIC_PASSWORD} -X POST "http://localhost:9200/_security/user/logstash_system/_password" -H "Content-Type: application/json" -d '{"password": "${LOGSTASH_PASSWORD}"}'
#RUN curl -u elastic:${ELASTIC_PASSWORD} -X POST "http://localhost:9200/_security/user/kibana_system/_password" -H "Content-Type: application/json" -d '{"password": "${ELASTICSEARCH_PASSWORD}"}'
COPY setup.sh /setup.sh
#ENTRYPOINT ["/bin/sh","-c","/usr/local/bin/docker-entrypoint.sh elasticsearch"]
#RUN ["/setup.sh"]
ENTRYPOINT ["/bin/sh","-c","/usr/local/bin/docker-entrypoint.sh elasticsearch & until curl -k -u elastic:UMApassWord123 http://elasticsearch:9200; do sleep 10; done; /setup.sh & wait"]