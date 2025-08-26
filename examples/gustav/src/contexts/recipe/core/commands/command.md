./src/contexts/<CONTEXT>/core/commands/<COMMAND>.ts

We define the commands and command processors here.

In other libraries or frameworks this place might be referred to as use-cases.
But as we want to emphasize the CQRS pattern we intentionally split up the write use-cases which occur through commands and the read use-cases which occur through queries.
