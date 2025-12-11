FROM elasticsearch:8.13.0
RUN set -eux; \
    # if user already present in the file realm skip; otherwise try add and ignore exit code if user exists elsewhere
    if grep -q '^kibana_user:' /usr/share/elasticsearch/config/users 2>/dev/null; then \
      echo "kibana_user present in config/users, skipping"; \
    else \
      echo "attempting to create kibana_user (will not fail if already exists)"; \
      bin/elasticsearch-users useradd kibana_user -p 'KibanaPass' -r kibana_system || true; \
    fi