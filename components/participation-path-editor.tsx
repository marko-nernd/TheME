"use client";

import { useState } from "react";
import {
  defaultParticipationPaths,
  participationTypes,
  participationDescription,
  type ParticipationPathInput,
} from "@/lib/participation";

export default function ParticipationPathEditor({
  initialPaths = defaultParticipationPaths,
  onChange,
  name = "participationPaths",
}: {
  initialPaths?: ParticipationPathInput[];
  onChange?: (paths: ParticipationPathInput[]) => void;
  name?: string;
}) {
  const [paths, setPaths] = useState(() =>
    defaultParticipationPaths.map((fallback) => ({
      ...fallback,
      ...(initialPaths.find((path) => path.type === fallback.type) ?? {}),
      description: participationDescription(initialPaths.find((path) => path.type === fallback.type) ?? fallback),
    })),
  );

  function update(
    type: ParticipationPathInput["type"],
    values: Partial<ParticipationPathInput>,
  ) {
    setPaths((current) => {
      const next = current.map((path) =>
        path.type === type ? { ...path, ...values } : path,
      );
      onChange?.(next);
      return next;
    });
  }

  return (
    <div className="participation-path-editor">
      <input name={name} type="hidden" value={JSON.stringify(paths)} />
      {participationTypes.map((definition) => {
        const path = paths.find((item) => item.type === definition.type)!;
        return (
          <article
            className={path.enabled ? "participation-path is-enabled" : "participation-path"}
            key={path.type}
          >
            <header>
              <div>
                <span>{definition.label}</span>
                <p>{definition.description}</p>
              </div>
              <label className="path-toggle">
                <input
                  type="checkbox"
                  checked={path.enabled}
                  onChange={(event) =>
                    update(path.type, { enabled: event.target.checked })
                  }
                />
                Offer this path
              </label>
            </header>
            {path.enabled && (
              <div className="participation-path-fields">
                <label>
                  Public title
                  <input
                    value={path.title}
                    maxLength={80}
                    onChange={(event) =>
                      update(path.type, { title: event.target.value })
                    }
                    required
                  />
                </label>
                <label>
                  Price per person ($)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={path.priceCents / 100}
                    onChange={(event) =>
                      update(path.type, {
                        priceCents: Math.round(Number(event.target.value) * 100),
                      })
                    }
                    required
                  />
                </label>
                <label>
                  Available places
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    value={path.capacity}
                    onChange={(event) =>
                      update(path.type, { capacity: Number(event.target.value) })
                    }
                    required
                  />
                </label>
                {path.type === "sponsor" ? <label className="path-approval">
                  <input
                    type="checkbox"
                    checked={path.approvalRequired}
                    onChange={(event) =>
                      update(path.type, {
                        approvalRequired: event.target.checked,
                      })
                    }
                  />
                  Host approval required before payment
                </label> : <p className="field-help">Participants book directly. Paid places are confirmed after payment; free places are confirmed immediately.</p>}
                <label className="path-description">
                  What this participant receives
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={path.description}
                    onChange={(event) =>
                      update(path.type, { description: event.target.value })
                    }
                  />
                </label>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
