document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("projectsGrid");
  if (!grid) return;

  // prevent double render
  if (grid.dataset.rendered === "true") return;
  grid.dataset.rendered = "true";

  grid.innerHTML = "";

  let data;

  try {
    const res = await fetch("data/projects.json", { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    data = await res.json();
  } catch (err) {
    console.error("Projects load failed:", err);

    grid.innerHTML = `
      <div class="card">
        <h3>Projects unavailable</h3>
        <p class="muted">
          Could not load <code>data/projects.json</code>.<br>
          Check file path or server config.
        </p>
      </div>
    `;
    return;
  }

  if (!data || !Array.isArray(data.projects)) {
    grid.innerHTML = `
      <div class="card">
        <h3>Invalid projects data</h3>
        <p class="muted">JSON loaded but format is wrong.</p>
      </div>
    `;
    return;
  }

  for (const project of data.projects) {
    const title = project.title ?? "Untitled";
    const desc =
      typeof project.desc === "string"
        ? project.desc
        : project.desc?.en ?? project.description ?? "";

    const href = project.href ?? null;
    const tags = Array.isArray(project.tags) ? project.tags : [];
    const size = project.size ?? "normal";

    const card = document.createElement("div");
    card.className = `card project ${size}`;

    card.innerHTML = `
      <h3>${title}</h3>
      ${desc ? `<p>${desc}</p>` : ""}
      ${
        tags.length
          ? `<div class="tags">${tags.map(t => `<span>${t}</span>`).join("")}</div>`
          : ""
      }
    `;

    if (href) {
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noreferrer";
      a.appendChild(card);
      grid.appendChild(a);
    } else {
      grid.appendChild(card);
    }
  }
});