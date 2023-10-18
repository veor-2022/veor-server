#!/bin/sh

docker build . -t registry.lab.bctc.io/veor-api/app
# docker run -t -i -p 3000:400 hello-world
docker-compose run --service-ports
