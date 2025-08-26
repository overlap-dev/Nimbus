./src/contexts/<CONTEXT>/core/queries/<QUERY>.ts

We define the queries and query processors here.

In other libraries or frameworks this place might be referred to as use-cases.
But as we want to emphasize the CQRS pattern we intentionally split up the write use-cases which occur through commands and the read use-cases which occur through queries.
