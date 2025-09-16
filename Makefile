all : upd

build : 
	@docker-compose build

up : 
	@docker-compose up

up-server:
	@docker-compose up Fastify -d

upd : 
	@docker-compose up --build -d

down : 
	@docker-compose down

down-server:
	@docker-compose rm -f Fastify

downv : 
	@docker-compose down -v

stop : 
	@docker-compose stop

start : 
	@docker-compose start

status : 
	@docker-compose ps

logs:
	docker logs Fastify
	docker logs SQL_Lite
	docker logs Nginx

clean: down
	@docker system prune -f
	@docker volume prune -f

fclean: clean
	@docker system prune -a -f
	@docker image prune -a -f
	@docker container prune -f
	@docker builder prune -a -f
	@docker network prune -f

dev: upd
	@cd frontend && npm run dev

restart-server: down-server up-server

re: downv upd
