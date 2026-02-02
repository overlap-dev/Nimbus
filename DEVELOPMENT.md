# EventSourcingDB

To use the EventSourcingDB for testing and development purposes, you can use the following commands and find all the details in the [EventSourcingDB documentation](https://docs.eventsourcingdb.io/).

**Install EventSourcingDB**

```bash
docker pull thenativeweb/eventsourcingdb
```

**Start EventSourcingDB with temporary data**

```bash
docker run -it -p 3000:3000 \
  thenativeweb/eventsourcingdb run \
  --api-token=secret \
  --data-directory-temporary \
  --http-enabled \
  --https-enabled=false \
  --with-ui
```

**Start EventSourcingDB with persistent data**

The data will be stored in the `esdb-data` directory which is ignored by Git.

```bash
docker run -it \
  -p 3000:3000 \
  -v ./esdb-data:/var/lib/esdb \
  thenativeweb/eventsourcingdb run \
  --api-token=secret \
  --data-directory=/var/lib/esdb \
  --http-enabled \
  --https-enabled=false \
  --with-ui
```
