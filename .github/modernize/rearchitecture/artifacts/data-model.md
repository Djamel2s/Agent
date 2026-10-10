# Existing data model

No persisted application data model is implemented. PostgreSQL and Redis are declared by Compose but no migrations, ORM, repositories, or database queries exist in the maintained source.

The current in-memory/demo models are:

- `DemoAgent`: identity, role, model, state, tools, skills, and current activity.
- `DemoTask`: title, assigned agent, status, priority, budget, ordered steps, and progress.
- `Approval`: action/security approval request with risk, actor, target, and decision labels.
- `ChatConv`/`ChatMsg`: demo conversation grouping and user/assistant messages, optionally with tool/artifact labels.
- Desktop `State`: agents, pending approvals, log lines, UI mode flags, story step, and sequence counter.
- `PolicySet`: resource policies by action level plus platform/resource/agent kill switches.

Relationships are in-memory references only: tasks reference agent names, approvals may reference an agent id, and desktop state owns the collections. There are no database keys, foreign keys, relationship annotations, or transaction-backed entities.
