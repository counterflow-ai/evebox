FROM centos:7
LABEL maintainer="Counterflow AI <ss@counterflowai.com>"

# RUN rpm -Uvh https://evebox.org/files/rpm/development/evebox-development-release.noarch.rpm && \
#     yum install --disablerepo=* --enablerepo=evebox-development -y evebox && \
#     /usr/bin/evebox version

RUN rpm -Uvh http://ci-artifacts.counterflowai.com.s3.amazonaws.com/devel/evebox-latest-x86_64.rpm && \
    yum install -y evebox && \
    /usr/bin/evebox version

EXPOSE 5636

COPY /docker-entrypoint.sh /

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["evebox", "server"]
