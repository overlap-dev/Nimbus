# The Philosophy behind Nimbus

Nimbus is built on a few core principles that set it apart from other TypeScript frameworks.

## Simplicity

Nimbus aims to keep things simple and to avoid overly complex OOP or FP principles. No complex inheritance hierarchies, no dependency injection, no decorators. Just explicit code that is easy to understand and reason about.

## No Framework Magic

Three lines of code to build a whole API is great, until something goes wrong and you have no clue why the magic stopped working.

## Flat and easy learning curve

There are already great Frameworks like [NestJS](https://nestjs.com/) and [Effect](https://effect.website/) out there for building TypeScript applications.

While those frameworks heavily emphasize either object-oriented or functional programming patterns this comes with the cost of a steep learning curve. Nimbus aims to have a learning curve that is as flat as possible.

Be productive right from the start.

## Less Dependencies

Every dependency you pull in is code you did not write, running with the same privileges as your own. The recent wave of supply chain attacks on the npm ecosystem has made this risk impossible to ignore: a single compromised package, anywhere in the tree, can put your entire application at risk.

Nimbus takes this seriously. We keep our direct dependencies to a minimum and deliberately avoid packages that drag in long transitive chains. Less code from strangers means a smaller attack surface, faster installs, and a project you can actually audit.
