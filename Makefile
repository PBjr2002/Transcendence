all : upd

build : 
	@docker compose build

up : 
	@docker compose up

up-server:
	@docker compose up -d Nginx Fastify SQL_Lite

upd : 
	@docker compose up --build -d Nginx Fastify SQL_Lite

down : 
	@docker compose down

down-server:
	@docker compose rm -f Nginx Fastify SQL_Lite

downv : 
	@docker compose down -v

stop : 
	@docker compose stop

start : 
	@docker compose start

status : 
	@docker compose ps

logs:
	docker logs Fastify
	docker logs SQL_Lite
	docker logs Nginx

live_logs:
	docker logs Live_Fastify
	docker logs SQL_Lite
	docker logs Live_Nginx

clean: down
	@docker system prune -f
	@docker volume prune -f

fclean: clean
	@docker system prune -a -f
	@docker image prune -a -f
	@docker container prune -f
	@docker builder prune -a -f
	@docker network prune -f

dev: live_backend
	@cd frontend && BACKEND_URL=https://localhost:8081 npm run dev

live_backend:
	@docker compose up -d Live_Fastify Live_Nginx SQL_Lite

restart-server: down-server upd

NODE_VERSION=22.18.0
node:
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v

re: downv upd
