#!/bin/sh

set -e

until curl -k -u elastic:UMApassWord123 http://elasticsearch:9200; do
  echo "Waiting for Elasticsearch..."
  sleep 1
done


echo "Creating logstash_writer role..."
curl -u elastic:UMApassWord123 -X POST "http://localhost:9200/_security/user/logstash_system/_password" -H "Content-Type: application/json" -d '{"password": "OutraPASSword"}'

echo "Creating logstash user..."
curl -u elastic:UMApassWord123 -X POST "http://localhost:9200/_security/user/kibana_system/_password" -H "Content-Type: application/json" -d '{"password": "KibanaPass"}'

echo "Security bootstrap completed."