# Performance Checklist — Queue

For producer/consumer code in scope (RabbitMQ, Kafka, SQS, Redis Streams, BullMQ, Celery, etc.):

**Throughput & Backpressure**
- Consumer prefetch / `max_in_flight` tuning vs processing time
- Missing concurrency on consumer side (single-threaded loop on multi-partition topic)
- Producer batching opportunities (Kafka `linger.ms`/`batch.size`, AMQP publisher confirms in batches)
- Synchronous waits inside the consume loop blocking other messages

**Reliability**
- No idempotency key → duplicate processing risk on at-least-once delivery
- Acknowledgement before processing completes (loses messages on crash)
- Acknowledgement after long processing without heartbeat (broker requeues mid-flight)
- Missing dead-letter queue / retry policy
- Retries without exponential backoff or jitter

**Message Shape**
- Oversized payloads (broker per-message limits, network pressure) — recommend storing payload in object store + passing reference
- Schema drift without versioning

**Observability**
- No metric on queue depth / consumer lag → you will only learn about backpressure from user reports

**Worker Hygiene**
- Long-running tasks without checkpointing → restart loses work
- Memory growth across messages (consumer process leaks state)
