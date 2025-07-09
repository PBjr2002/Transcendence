all : upd

build : 
	@docker-compose build

up : 
	@docker-compose up

upd : 
	@docker-compose up -d

down : 
	@docker-compose down

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

re: downv upd
