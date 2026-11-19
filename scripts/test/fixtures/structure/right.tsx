// The same screen written right: no finding.
export function Account({ when, items, icon }: { when: string; items: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div className="fd-stack">
      <div className="fd-callout" data-tone="warning" role="note">
        <fd-icon class="fd-callout-icon" icon="triangle-alert"></fd-icon>
        <div className="fd-callout-content"><p className="fd-callout-body">Your card expires {when}.</p></div>
      </div>
      <div className="fd-callout" role="note">{icon}<div className="fd-callout-content"><p className="fd-callout-body">Saved.</p></div></div>
      <form className="fd-form">
        <section className="fd-form-section"><div className="fd-form-section-head"><h2 className="fd-form-section-title">Profile</h2></div><div className="fd-form-section-body"><p>Name</p></div></section>
      </form>
      <label className="fd-select"><select aria-label="Role"><option>Owner</option></select></label>
      <div className="fd-menu" id="acct-menu" role="menu" popover="auto">{items}</div>
      <div className="fd-field" role="group" aria-labelledby="notify-l"><span className="fd-field-label" id="notify-l">Notifications</span></div>
      <div className="fd-table-wrap"><div className="fd-table-scroll"><table className="fd-table" aria-label="Keys"><tbody><tr><td>Key</td></tr></tbody></table></div></div>
    </div>
  );
}
