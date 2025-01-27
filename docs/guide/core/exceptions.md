# Exceptions

Nimbus defines a set of exceptions that you can use to handle errors in your application. These exceptions are used to communicate errors of a certain type.

## Examples

You can optionally pass a message and a details object to provide further information.

All Exceptions have a `fromError()` method to convert a standard JavaScript error into a Nimbus exception. This takes care to keep the original error message and stack trace.

For the `InvalidInputException` you can use the `fromZodError()` method to convert a Zod error into a Nimbus exception. This will keep the original error message and stack trace and also keeps the validation details.

::: code-group

```typescript [Basics]
import {
    ForbiddenException,
    GenericException,
    InvalidInputException,
    NotFoundException,
    UnauthorizedException,
} from "@nimbus/core";

// Status code 500
throw new GenericException("Something went wrong");

// Status code 400
throw new InvalidInputException("The input is invalid", { foo: "bar" });

// Status code 401
throw new UnauthorizedException();

// Status code 403
throw new ForbiddenException();

// Status code 404
throw new NotFoundException("Account not found", {
    errorCode: "ACCOUNT_NOT_FOUND",
    reason: "The account with the provided id was not found",
});
```

```typescript [.fromError]
import { GenericException } from "@nimbus/core";

const someError = new Error("Something went wrong");

const exception = new GenericException();
exception.fromError(someError);

throw exception;
```

```typescript [.fromZodError]
import { InvalidInputException } from "@nimbus/core";
import { z } from "zod";

const MyZodType = z.object({
    sub: z.string(),
    groups: z.array(z.string()),
});

try {
    MyZodType.parse({ sub: 123, groups: ["bar"] });
} catch (error) {
    const exception = new InvalidInputException();
    exception.fromZodError(error);

    throw exception;
}
```

:::

## Create a new exception

In case you need to add other types of exceptions you can simply create a new exception by extending the `BaseException` class.

```typescript
import { Exception } from "@nimbus/core";

export class MySpecialException extends Exception {
    constructor(message?: string, details?: Record<string, unknown>) {
        super(
            "MY_SPECIAL_EXCEPTION", // The exception name
            message ?? "Something Special", // provided message or fallback
            details, // pass the provided details
            500 // the status code
        );
    }
}

// Usage
throw new MySpecialException("Something went wrong", { foo: "bar" });
```
