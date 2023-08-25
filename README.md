# container-starter

BCTC Container Starter Template

## Prerequisite

### Development Environment

- Before starting using this app, you should have node version 16 installed with npm version 7 to support
  `package-lock.json` version 2.

## Usage

When you have created a new repository, ask one of the L4+ engineer to setup your repository build secert `DOCKER_REGISTRY_USERNAME` and `DOCKER_REGISTRY_PASSWORD`.

1. Start by editing the `Dockerfile`, change config if needed.

1. Edit `build.sh`, change `changeme_appname` to project's name.

1. Edit `docker-compose.yml`, change `changeme_appname` to project's name, change `changeme_host` to a host name. If port is not 3005(default), change the `ports` list accordingly.

1. Edit `.github/workflows/build.yml`, change `changeme_appname` to project's name.

## Enviorment

### Docker Enviorment

- Node 16 running on top of alpine linux
- Default shell is `/bin/sh`, username is `root`, no password.

### Host Enviorment

- Redis server on default port(6379) @ 127.0.0.1
- Ingress Router is Traefik
- All container MUST route through the `proxy` network.

## Pushing to docker registry

Manual push is not recommended and should be used as last resort.

`docker push registry.lab.bctc.io/<changeme_appname>/app`

## Deploy

When deploying to lab/production, please have your `docker-compose.yml` file and `.env` file ready.

### Env deploy

Do not deploy env to Stack, deploy them to Container

1. Click on project container

1. Click `Duplicate/Edit`

1. Advanced container settings -> Env

1. Click `Load vars. from .env file`, select env file.

1. Click `Deploy Container`

1. Click `Replace`

### Enable watch dog

Crash are unavoidable, docker have a watchdog that will reboot the container if it ever crashes.

1. Click on project container

1. Navigate to `Container Details`

1. In `RESTART POLICIES`, change from `None` to `Unless Stopped`.

1. Click `Update`
