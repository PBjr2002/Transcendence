#!/bin/sh

until curl -k -u elastic:${ELASTIC_PASSWORD} http://elasticsearch:9200; do
  echo "Waiting for Elasticsearch..."
  sleep 3
done

sleep 10