# The Era of AI

The conversation around AI today is dominated by ever larger models and increasingly autonomous agents. It is easy to get caught up in the hype and lose sight of what actually makes these systems useful.

AI is not a magic wand. No LLM, no matter how capable, can answer meaningful questions about your business or solve real problems if the data it relies on is incomplete, inconsistent, or missing the context of _how_ things came to be. The model is only as good as what you feed it.

This is where event-driven architecture, and in particular **Event Sourcing**, becomes a strategic asset. Instead of storing only the current state of your system, Event Sourcing captures every fact that ever happened as an immutable event. The result is a complete, time-ordered history of your business domain - exactly the kind of high-quality, contextual data that AI systems thrive on.

If you'd like to dive deeper into the topic of AI and Event Sourcing, check out [eventsourcing.ai](https://www.eventsourcing.ai/).

## Nimbus as AI Enabler

Nimbus is meant to build applications based on messages: [Commands](/guide/core/commands), [Events](/guide/core/events), and [Queries](/guide/core/queries). This is the perfect fit to combine it with Domain Driven Design and Event Sourcing.

This way you are building the data foundation that makes future AI use cases - from analytics and forecasting to agentic workflows - viable rather than aspirational.
