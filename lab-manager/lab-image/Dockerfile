FROM debian:stable-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash coreutils ca-certificates curl iproute2 iputils-ping dnsutils \
  && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 -s /bin/bash lab
USER 1000:1000
WORKDIR /home/lab

CMD ["sleep", "infinity"]