---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
    name: "Nimbus"
    text: "Simplify Event-Driven Applications"
    tagline: Build event-driven applications with Typescript.
    image:
        src: https://raw.githubusercontent.com/overlap-dev/Nimbus/main/media/Nimbus.svg
        alt: Nimbus

    actions:
        - theme: brand
          text: What is Nimbus?
          link: /guide/what-is-nimbus
        - theme: alt
          text: Quickstart
          link: /guide/quickstart
        - theme: alt
          text: GitHub
          link: https://github.com/overlap-dev/Nimbus
---

<script setup>
import Features from './components/Features.vue'

const features = [
    {
        icon: '❗️',
        title: 'Simple Core Concepts',
        details: '<p>No clunky and complex OOP or FP design principles. No Framework Magic. Just explicit code.</p> <p>Compose an application with commands, events, and queries.</p>',
    },
    {
        icon: '❗️',
        title: 'CQRS',
        details: '<p>The real world doesn\'t operate in snapshots – it operates in actions, events and outcomes.</p> <p>Nimbus is a perfect fit for CQRS. Read more on <a href="https://cqrs.com/" target="_blank" rel="noopener noreferrer">cqrs.com</a>.</p>',
    },
    {
        icon: '❗️',
        title: 'Event Sourcing',
        details: '<p>When building your application to reflect real world actions and events it is crucial to store those events properly.</p> <p>Nimbus integrates seamlessly with <a href="https://www.thenativeweb.io/products/eventsourcingdb" target="_blank" rel="noopener noreferrer">EventSourcingDB</a>.</p>',
    },
    {
        icon: '❗️',
        title: 'Observability Built-In',
        details: '<p>Logging, tracing, and metrics. Batteries included.</p> <p>Nimbus uses <a href="https://opentelemetry.io/" target="_blank" rel="noopener noreferrer">OpenTelemetry</a> for all relevant operations to provide a solid foundation for observability out of the box.</p>',
    },
]
</script>

<Features :features="features" />
