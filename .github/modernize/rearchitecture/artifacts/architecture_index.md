# Architecture index

## Implementation Guide

This index is not the full contract. Do not implement from this file alone; follow the artifact paths below.

Global artifacts: `unit_graph.yaml` defines boundaries and dependencies; `migration_boundary.yaml` is the implementation-scope contract; `wire_contracts.yaml` contains external contracts; `shared_modules.yaml` lists shared code; `cross_unit_state.yaml` lists implicit state flows. No seams were found that require a separate `seams.yaml`.

For every unit, read its `behavior.yaml`, `bindings.yaml`, and `unit_decomposition.yaml`. Filter global rows by the unit name, `used_by_units`, or writer/reader fields. Completion evidence must report artifacts read, preserved behaviors/contracts, deferred items, and verification evidence.

Units:

- `web-application`: page routes and shared shell. Read `units/web-application/*`; preserve demo-only states and provider-status rendering.
- `admin-console`: admin page and local governance tabs. Read `units/admin-console/*`; preserve explicit demo-only behavior.
- `api-health`: `/health`. Read `units/api-health/*`; preserve exact response.
- `api-provider-status`: provider capability endpoint. Read `units/api-provider-status/*`; never expose keys.
- `api-policy-evaluate`: policy endpoint. Read `units/api-policy-evaluate/*`; preserve Zod validation and fail-closed result.
- `policy-engine`: pure policy API. Read `units/policy-engine/*`; preserve risk thresholds and kill-switch precedence.
- `desktop-ui`: Electron renderer/store. Read `units/desktop-ui/*`; preserve state-machine transitions and IPC whitelist.
- `desktop-bridge-agent`: presence endpoint. Read `units/desktop-bridge-agent/*`; preserve loopback/token/body validation.
- `desktop-bridge-approval`: approval endpoint and decision IPC. Read `units/desktop-bridge-approval/*`; preserve timeout, cancellation, and fail-closed behavior.
