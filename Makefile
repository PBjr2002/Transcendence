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

NODE_VERSION=22.18.0
node:
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v

re: downv upd
