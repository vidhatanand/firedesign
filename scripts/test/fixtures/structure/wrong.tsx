// The five mistakes in JSX.
export function Account({ when, items }: { when: string; items: React.ReactNode }) {
  return (
    <div className="fd-stack">
      <div className="fd-callout" data-tone="warning" role="note">
        <div className="fd-callout-content"><p className="fd-callout-body">Your card expires {when}.</p></div>
      </div>
      <div className="fd-grid">
        <section className="fd-form-section"><div className="fd-form-section-head"><h2 className="fd-form-section-title">Profile</h2></div><div className="fd-form-section-body"><p>Name</p></div></section>
      </div>
      <select className="fd-select" aria-label="Role"><option>Owner</option></select>
      <div className="fd-menu" id="acct-menu" role="menu" hidden>{items}</div>
      <fieldset><legend>Notifications</legend></fieldset>
      <table><tbody><tr><td>Key</td></tr></tbody></table>
      <div className="fd-card"><table className="fd-table" aria-label="Keys"><tbody><tr><td>Key</td></tr></tbody></table></div>
    </div>
  );
}
