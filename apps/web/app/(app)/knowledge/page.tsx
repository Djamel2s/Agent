import { KNOWLEDGE } from "../../../lib/demo";
import { Badge, Page, PageHeader } from "../../../components/ui";

export default function KnowledgePage() {
  return (
    <Page>
      <PageHeader title="Knowledge" sub="Retrieval always filters by the requester’s permissions." actions={<button className="btn primary">+ Add source</button>} />
      <div className="grid g3">
        {KNOWLEDGE.map((k) => (
          <div key={k.name} className="card hover"><b>{k.name}</b>
            <div className="muted small" style={{ margin: "6px 0 12px" }}>{k.docs} documents · updated {k.updated}</div>
            <div className="row"><Badge>Access: {k.acl}</Badge><Badge tone="warn">Demo</Badge></div></div>
        ))}
      </div>
    </Page>
  );
}
