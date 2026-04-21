<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus Utils

A small collection of utility helpers used across the Nimbus framework — currently a single helper, `getEnv`, for reading required environment variables in a fail-fast way.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

## Install

```bash
# Deno
deno add jsr:@nimbus-cqrs/utils

# NPM
npm install @nimbus-cqrs/utils

# Bun
bun add @nimbus-cqrs/utils
```

# Examples

For detailed documentation, please refer to the [Nimbus documentation](https://nimbus.overlap.at).

## getEnv

`getEnv` reads a list of environment variables from `process.env` and returns them as a plain object. If any of the requested variables are missing it logs the missing names through the Nimbus logger and throws a `GenericException`, so misconfiguration fails loudly at startup instead of leaking through as `undefined` later.

```typescript
import { getEnv } from '@nimbus-cqrs/utils';

const env = getEnv({
    variables: ['MONGO_URI', 'MONGO_DB_NAME'],
});

console.log(env.MONGO_URI);     // "mongodb://localhost:27017"
console.log(env.MONGO_DB_NAME); // "my-app"
```

If, for example, `MONGO_DB_NAME` is not set, the call throws a `GenericException` whose `data` carries the list of missing variables:

```json
{
    "name": "GenericException",
    "message": "Undefined environment variables",
    "data": {
        "undefinedVariables": ["MONGO_DB_NAME"]
    }
}
```

A typical pattern is to call `getEnv` once at application startup, before any subsystem that needs those values is initialized:

```typescript
import { getEnv } from '@nimbus-cqrs/utils';
import { MongoConnectionManager } from '@nimbus-cqrs/mongodb';

const env = getEnv({
    variables: ['MONGO_URI', 'MONGO_DB_NAME'],
});

const mongo = new MongoConnectionManager({
    uri: env.MONGO_URI,
    dbName: env.MONGO_DB_NAME,
});
```

# License

Copyright 2024-present Overlap GmbH & Co KG (https://overlap.at)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
