import { INTEGRATIONS } from "../../../lib/demo";
import { Badge, Page, PageHeader } from "../../../components/ui";

const TONE = { Connected: "ok", "Not configured": "warn", "Coming soon": "" } as const;

export default function IntegrationsPage() {
  return (
    <Page>
      <PageHeader title="Integrations" sub="Adapters, MCP servers and custom connectors. Only “Connected” items would be live." />
      <div className="grid g3">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="card hover">
            <div className="row" style={{ justifyContent: "space-between" }}><b>{i.name}</b><Badge tone={TONE[i.status]}>{i.status}</Badge></div>
            <div className="muted small" style={{ margin: "6px 0 12px" }}>{i.group}</div>
            <button className="btn" disabled={i.status === "Coming soon"}>{i.status === "Connected" ? "Manage" : "Configure"}</button>
          </div>
        ))}
      </div>
    </Page>
  );
}
