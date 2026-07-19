<img 
    src="https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/intro.png" 
    alt="Nimbus"
/>

# Nimbus Utils

> **Deprecated.** This package is deprecated. Import `getEnv` from [`@nimbus-cqrs/core`](https://www.npmjs.com/package/@nimbus-cqrs/core) instead. `@nimbus-cqrs/utils` remains available as a thin re-export for backwards compatibility.

Refer to the [Nimbus main repository](https://github.com/overlap-dev/Nimbus) or the [Nimbus documentation](https://nimbus.overlap.at) for more information about the Nimbus framework.

## Migration

```typescript
// Before
import { getEnv } from "@nimbus-cqrs/utils";

// After
import { getEnv } from "@nimbus-cqrs/core";
```

## Install (legacy)

```bash
# Deno
deno add npm:@nimbus-cqrs/utils

# NPM
npm install @nimbus-cqrs/utils

# Bun
bun add @nimbus-cqrs/utils
```

Prefer installing `@nimbus-cqrs/core` directly.

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
