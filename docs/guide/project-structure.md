# Project Structure

Nimbus is not opinionated about the project structure and you can adjust it to your needs. But here is a suggestion on how to structure your project.

### Example App - The Expense

You can find the example app on [GitHub](https://github.com/overlap-dev/Nimbus/tree/main/examples/the-expense)

Let's say we are building an application to track expenses so we can come up with the following structure.

```
/-
  |- src
    |- account
      |- core
      |- shell
    |- auth
        |- core
        |- shell
    |- another-domain
      |- context-one
        |- core
        |- shell
      |- context-two
        |- core
        |- shell
    |- shared
    |- ...
    |- main.ts
  |- .gitignore
  |- deno.json
  |- deno.lock
  |- README.md
```

At first we want to separate the different domains and contexts of our problem based on the Domain Driven Design (DDD) principles. So we create a directory for each domain like `account` and `auth`. We also have a `shared` directory for things that are used across multiple domains.

And secondly we want to separate the core logic from the shell implementation. So we create a `core` and a `shell` directory in each context.
