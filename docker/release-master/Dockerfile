FROM centos:7
MAINTAINER Jason Ish <ish@unx.ca>

RUN rpm -Uvh http://evebox.opnids.io.s3.amazonaws.com/master/evebox-latest-x86_64.rpm && \
    yum install -y evebox && \
    /usr/bin/evebox version

EXPOSE 5636

COPY /docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["evebox", "server"]
