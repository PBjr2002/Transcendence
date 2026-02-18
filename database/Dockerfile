FROM debian:oldstable

RUN apt update

RUN apt install -y sqlite3

WORKDIR /workdir

RUN chown -R root:root .

COPY database_init.sh tables.sql users.sql ./

RUN chmod +x ./database_init.sh

VOLUME ["/SQLite_data"]

ENTRYPOINT ["./database_init.sh"]
