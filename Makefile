all : upd

build : 
	@docker compose build

up : 
	@docker compose up

up-server:
	@docker compose up -d

upd : 
	@docker compose up --build -d

down : 
	@docker compose down

down-server :
	@docker compose rm -f

downv : 
	@docker compose down -v

stop : 
	@docker compose stop

start : 
	@docker compose start

status : 
	@docker compose ps

logs :
	docker logs Fastify
	docker logs SQL_Lite
	docker logs Nginx
	docker logs elk-setup
	docker logs elasticsearch
	docker logs kibana
	docker logs filebeat
	docker logs logstash
	docker logs metricbeat

clean : down
	@docker system prune -f
	@docker volume prune -f

fclean : clean
	@docker system prune -a -f
	@docker image prune -a -f
	@docker container prune -f
	@docker builder prune -a -f
	@docker network prune -f

restart-server : down-server upd

NODE_VERSION=22.18.0
node :
	. $$HOME/.nvm/nvm.sh && nvm install $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm use $(NODE_VERSION)
	. $$HOME/.nvm/nvm.sh && nvm alias default $(NODE_VERSION)
	node -v

re : downv upd

# Live changes
# dev : live_backend
# 	@cd frontend && BACKEND_URL=https://localhost:8081 npm run dev
#
# live_backend : build
# 	@docker compose up -d Live_Fastify Live_Nginx SQL_Lite
#
# live_logs :
# 	docker logs Live_Fastify
# 	docker logs SQL_Lite
# 	docker logs Live_Nginx
