FROM alpine:3.20

RUN apk add --no-cache sqlite

WORKDIR /workdir

RUN chown -R root:root .

COPY database_init.sh tables.sql ./

RUN chmod +x ./database_init.sh

VOLUME ["/SQLite_data"]

ENTRYPOINT ["./database_init.sh"]