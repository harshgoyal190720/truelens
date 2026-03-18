(function () {
  const COUNTRY_BY_TLD = {
    uk: "United Kingdom",
    in: "India",
    au: "Australia",
    ca: "Canada",
    de: "Germany",
    fr: "France",
    jp: "Japan",
    br: "Brazil",
    us: "United States",
  };

  function sourceType(name) {
    const lower = (name || "").toLowerCase();
    if (
      lower.includes("reuters") ||
      lower.includes("ap") ||
      lower.includes("bbc") ||
      lower.includes("cnn") ||
      lower.includes("nytimes") ||
      lower.includes("guardian") ||
      lower.includes("the hindu") ||
      lower.includes("indian express") ||
      lower.includes("times of india") ||
      lower.includes("hindustan times") ||
      lower.includes("ndtv") ||
      lower.includes("deccan herald") ||
      lower.includes("livemint") ||
      lower.includes("business standard") ||
      lower.includes("ani")
    ) {
      return "mainstream";
    }
    if (
      lower.includes("blog") ||
      lower.includes("daily") ||
      lower.includes("opinion") ||
      lower.includes("post")
    ) {
      return "blog";
    }
    return "unknown";
  }

  function inferCountry(url) {
    try {
      const host = new URL(url).hostname;
      const tld = host.split(".").pop().toLowerCase();
      return COUNTRY_BY_TLD[tld] || "Unknown";
    } catch (error) {
      return "Unknown";
    }
  }

  function getSourceColor(type) {
    if (type === "mainstream") return "#5CA9FF";
    if (type === "blog") return "#FF9F43";
    return "#7E7E8B";
  }

  window.renderSpreadGraph = function renderSpreadGraph(claim, articles, targetId = "graphContainer") {
    const container = document.getElementById(targetId);
    container.innerHTML = "";

    const width = container.clientWidth || 720;
    const height = container.clientHeight || 440;
    const mobile = width < 500;
    const actualHeight = mobile ? 300 : height;

    const claimNode = {
      id: "claim",
      label: claim.slice(0, 70),
      isCenter: true,
      radius: mobile ? 22 : 28,
      color: "#E8C547",
      country: "N/A",
      title: claim,
      publishedAt: new Date().toISOString(),
    };

    const sourceNodes = articles.slice(0, 6).map((a, i) => {
      const type = sourceType(a.source?.name || "");
      const rel = Math.max(6, Math.min(18, 22 - i * 2));
      return {
        id: `source-${i}`,
        label: a.source?.name || "Unknown Source",
        isCenter: false,
        radius: rel,
        color: getSourceColor(type),
        type,
        title: a.title || "Untitled",
        country: inferCountry(a.url || ""),
        publishedAt: a.publishedAt || "",
      };
    });

    const nodes = [claimNode, ...sourceNodes];
    const links = sourceNodes.map((n) => ({ source: "claim", target: n.id }));

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", actualHeight)
      .attr("viewBox", `0 0 ${width} ${actualHeight}`);

    const edgeLayer = svg.append("g");
    const nodeLayer = svg.append("g");

    const link = edgeLayer
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "rgba(232,197,71,0.5)")
      .attr("stroke-width", 1.4)
      .attr("stroke-dasharray", "6 8")
      .attr("stroke-linecap", "round")
      .style("animation", "dashFlow 2s linear infinite");

    const node = nodeLayer
      .selectAll("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("class", (d) => (d.isCenter ? "" : "node-pulse"))
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => d.color)
      .attr("stroke", "rgba(232,197,71,0.3)")
      .attr("stroke-width", 1)
      .style("filter", "drop-shadow(0 0 8px rgba(0,0,0,0.55))");

    const label = nodeLayer
      .selectAll("text")
      .data(nodes)
      .enter()
      .append("text")
      .text((d) => (d.isCenter ? "CLAIM" : d.label.slice(0, 14)))
      .attr("font-size", (d) => (d.isCenter ? 11 : 9))
      .attr("fill", "#D7D4C8")
      .attr("font-family", "IBM Plex Mono")
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .style("pointer-events", "none");

    const tooltip = document.createElement("div");
    tooltip.className = "graph-tooltip hidden";
    container.appendChild(tooltip);

    node
      .on("mousemove", (event, d) => {
        const date = d.publishedAt ? new Date(d.publishedAt).toLocaleDateString() : "Unknown date";
        tooltip.innerHTML = `<strong>${d.label}</strong><br>${(d.title || "").slice(0, 85)}<br>${date}`;
        tooltip.style.left = `${event.offsetX + 14}px`;
        tooltip.style.top = `${event.offsetY + 14}px`;
        tooltip.classList.remove("hidden");
      })
      .on("mouseleave", () => tooltip.classList.add("hidden"));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance(mobile ? 88 : 120)
      )
      .force("charge", d3.forceManyBody().strength(mobile ? -210 : -320))
      .force("center", d3.forceCenter(width / 2, actualHeight / 2))
      .force("collision", d3.forceCollide().radius((d) => d.radius + 10));

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      label.attr("x", (d) => d.x).attr("y", (d) => d.y + d.radius + 12);
    });

    node
      .filter((d) => !d.isCenter)
      .transition()
      .duration(1100)
      .ease(d3.easeSinInOut)
      .attrTween("r", function pulse(d) {
        return function tween(t) {
          return d.radius + Math.sin(t * Math.PI * 2) * 1.1;
        };
      });

    const countryCount = new Set(sourceNodes.map((s) => s.country)).size;
    return {
      sourceCount: sourceNodes.length,
      countryCount,
    };
  };
})();
