FROM selenium/node-chrome

USER root

RUN apt-get update -qqy \
  && apt-get -qqy install nodejs npm \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/* \
  && wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.2/install.sh | bash \
  && . ~/.bashrc \
  && nvm install v8

ENV CHROME_BIN /opt/google/chrome

WORKDIR /usr/src
ENTRYPOINT npm i && npm test
