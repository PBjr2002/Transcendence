#!/bin/sh

set -e

until curl -k -u elastic:${ELASTIC_PASSWORD} http://elasticsearch:9200; do
  echo "Waiting for Elasticsearch..."
  sleep 3
done

echo "Creating logstash_writer role..."
curl -u elastic:${ELASTIC_PASSWORD} -X POST "http://localhost:9200/_security/user/logstash_system/_password" -H "Content-Type: application/json" -d '{"password": "OutraPASSword"}'

echo "Creating logstash user..."
curl -u elastic:${ELASTIC_PASSWORD} -X POST "http://localhost:9200/_security/user/kibana_system/_password" -H "Content-Type: application/json" -d '{"password": "KibanaPass"}'

echo "Security bootstrap completed."