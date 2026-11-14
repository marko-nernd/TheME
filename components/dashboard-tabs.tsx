"use client";

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode, useSyncExternalStore } from "react";

type DashboardTab = {
  id: string;
  label: string;
  description?: string;
};

export default function DashboardTabs({
  tabs,
  children,
}: {
  tabs: DashboardTab[];
  children: ReactNode;
}) {
  const defaultTab = tabs[0]?.id ?? "overview";
  const simpleNavigation = (tabs.length === 5 || tabs.length === 6) && tabs.some((tab) => tab.id === "activity");
  const activeTab = useSyncExternalStore(
    (notify) => {
      window.addEventListener("hashchange", notify);
      return () => window.removeEventListener("hashchange", notify);
    },
    () => {
      const requested = window.location.hash.replace(/^#/, "").split("&")[0]
        || new URLSearchParams(window.location.search).get("tab");
      if ((requested === "events" || requested === "reviews") && !tabs.some((tab) => tab.id === requested) && tabs.some((tab) => tab.id === "activity")) return "activity";
      return tabs.some((tab) => tab.id === requested) ? requested : defaultTab;
    },
    () => defaultTab,
  );

  function selectTab(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.delete("tab");
    url.hash = id;
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className={`dashboard-tabs dashboard-tab-${activeTab}${simpleNavigation ? " simple-member-navigation" : ""}`}>
      <nav className="dashboard-local-nav" aria-label="Dashboard sections" role="tablist">
        {tabs.map((tab) => (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`dashboard-panel-${tab.id}`}
            id={`dashboard-tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => {
              const index = tabs.findIndex((item) => item.id === activeTab);
              const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
              if (nextIndex < 0) return;
              event.preventDefault();
              selectTab(tabs[nextIndex].id);
              document.getElementById(`dashboard-tab-${tabs[nextIndex].id}`)?.focus();
            }}
            key={tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {simpleNavigation && <nav className="member-bottom-nav" aria-label="Quick dashboard navigation">{tabs.map((tab) => <button key={tab.id} type="button" aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => selectTab(tab.id)}><span aria-hidden="true">{tab.id === "overview" ? "⌂" : tab.id === "activity" ? "▣" : tab.id === "connections" ? "✉" : tab.id === "profile" ? "◎" : "$"}</span>{tab.id === "activity" ? "Events" : tab.label}</button>)}</nav>}
      {tabs.find((tab) => tab.id === activeTab)?.description && <p className="dashboard-tab-description">{tabs.find((tab) => tab.id === activeTab)?.description}</p>}
      <div className="dashboard-tab-panels">{Children.map(children, (child) => {
        if (!isValidElement(child)) return child;
        const panel = child as ReactElement<{ id?: string; hidden?: boolean; "aria-labelledby"?: string }>;
        if (!panel.props.id?.startsWith("dashboard-panel-")) return child;
        const id = panel.props.id.replace("dashboard-panel-", "");
        return cloneElement(panel, { hidden: id !== activeTab, "aria-labelledby": `dashboard-tab-${id}` });
      })}</div>
    </div>
  );
}
