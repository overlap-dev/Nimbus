---
next:
    text: "Core"
    link: "/guide/core"
---

# Example Application

Take the eventsourcing-demo application and walk the user through it step by step.

A short intro (Technical): This demo applications shows the use of Nimbus in conjunction with the CQRS and Event Sourcing pattern. It also utilizes Domain Driven Design principles to structures the application into different Domains with a core for the domain logic and a shell for the infrastructure and external interactions.

TODO: Make a nice diagram in ExcaliDraw to add here.

A short Intro (UseCase): The use case for this app shows a part of the IAM (Identity and Access Management) domain. It shows how to invite users to the system and how to manage their invitations.
We will have commands to invite a user and to accept an invitation with the resulting events.
We can list all users or query a single user with its full details. And we can list the email addresses of all pending users.

The go on and explain the user step by step how the application is built.

1. Start with the main.ts - As Nimbus aims to write explicit easy to understand code you can just follow along the main.ts from top to bottom and jump into functions (CMD + Click in the IDE) to follow the flow until you reach the core logic of a command or query.
2. Follow and describe the write side of the application first.
3. Explain the read side of the application. (Mention that for the read side we do not separate core and shell in this example because there is no business logic involved as we simply project what has happened in the write side.)
4. For each Nimbus module/part in the code link to the corresponding documentation page in the guide.
5. Take the comments in the code as a source for explanations

We need to talk about Aggregates ... Nimbus does not have a strict concept or abstraction for aggregates. In the example application we use the State definition, the core logic of the commands and the command handlers + EventSourcingDB features to do the job.
If you desire to build one aggregate class, it is up to you.
