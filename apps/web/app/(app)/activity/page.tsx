import { ACTIVITY } from "../../../lib/demo";
import { Page, PageHeader } from "../../../components/ui";

export default function ActivityPage() {
  return (
    <Page>
      <PageHeader title="Activity" sub="Operational events across users, agents, tools and integrations. No private reasoning is shown." />
      <div className="card"><div className="feed">
        {ACTIVITY.map((e, i) => (
          <div key={i} className={`feed-item k-${e.kind}`}><span className="muted mono small">{e.time}</span><span className="kdot" /><span><b>{e.agent}</b> {e.text}</span></div>
        ))}
      </div></div>
    </Page>
  );
}
