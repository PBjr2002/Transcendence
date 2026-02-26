ARG STACK_VERSION
FROM docker.elastic.co/beats/metricbeat:${STACK_VERSION}

USER root

COPY metricbeat.yml /usr/share/metricbeat/metricbeat.yml

RUN chown root:root /usr/share/metricbeat/metricbeat.yml && \
    chmod 0644 /usr/share/metricbeat/metricbeat.yml

USER metricbeat
