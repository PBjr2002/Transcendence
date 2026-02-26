ARG STACK_VERSION
FROM docker.elastic.co/beats/filebeat:${STACK_VERSION}

USER root

COPY filebeat.yml /usr/share/filebeat/filebeat.yml

RUN chown root:root /usr/share/filebeat/filebeat.yml && \
    chmod 0644 /usr/share/filebeat/filebeat.yml

USER filebeat
