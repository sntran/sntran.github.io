import { router } from "./lib/router.js";

async function home(request, env) {
  const url = new URL(request.url);

  let response = atom(new Request(url, {
    headers: {
      Accept: "application/json",
    },
  }), env);
  const feed = await response.json();

  url.pathname = "/static/index.html";
  response = await env.ASSETS.fetch(url);

  const tree = {
    title: new URL(feed.href).hostname,
    href: feed.href,
    children: [],
  }

  const linkMap = {};

  feed.entries.forEach(({ href }) => {
    const [title, ...ancestors] = href.split("/").filter(Boolean).reverse();
    const parent = ancestors.reverse().join("/");
    const link = {
      title,
      href,
      parent,
      children: [],
    }
    linkMap[href] = link;

    if (!parent) {
      tree.children.push(link);
    } else if (linkMap[parent + "/"]) {
      linkMap[parent + "/"].children.push(link);
    }
  });

  function renderLink(link) {
    const children = link.children;
    if (!children.length) {
      return `<li>
        <a href="${link.href}">
          ${link.title}
        </a>
      </li>`;
    }
    return `<li>
      <details ${ children[0].parent ? "" : "open"}>
        <summary>${link.title}</summary>

        <ul class="pl-4">
          ${children
            .sort((a, b) => a.children.length > b.children.length ? -1 : 1)
            .map(renderLink)
            .join("")
          }
          ${link.href.endsWith("/")
            ? `<li><a href="${link.href}">README.md</a></li>`
            : ""
          }
        </ul>
      </details>
    </li>`;
  }

  const contentOptions = { html: true };
  const rewriter = new HTMLRewriter();

  rewriter.on(`nav[role="navigation"][aria-label="Primary"] > ul`, {
    // Adds feed entries to the navigation menu.
    element(element) {
      element.setInnerContent(renderLink(tree), contentOptions);
    },
  });

  response = rewriter.transform(response);
  return response;
}

function atom(request) {
  const { headers, url } = request;
  const { origin = "https://sntran.com" } = new URL(url);

  const feed = {
    title: "Trần Nguyễn Sơn's Space",
    description: "Personal space for Trần Nguyễn Sơn",
    href: origin,
    lastModified: new Date().toISOString(),
    author: {
      name: "Trần Nguyễn Sơn",
      email: "contact@sntran.com",
    },
    entries: [
      {
        title: "About",
        description: "About Me",
        href: "README.md",
        lastModified: new Date().toISOString(),
      },
      {
        title: "Projects",
        description: "All projects contributed by me",
        href: "Projects/",
        lastModified: new Date().toISOString(),
      },
      {
        title: "Project A",
        description: "Project A summary",
        href: "Projects/Project-A/",
        lastModified: new Date().toISOString(),
      },
      {
        title: "Changelog",
        description: "Project A changelog",
        href: "Projects/Project-A/CHANGELOG.md",
        lastModified: new Date().toISOString(),
      },
    ],
  }

  if (headers.get("Accept") === "application/json") {
    return Response.json(feed);
  }

  return new Response(
    `<?xml version="1.0" encoding="UTF-8" ?>
    <?xml-stylesheet type="text/xsl" href="index.xsl" ?>
    <?xslt-param name="html" value="index.html"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <id>${origin}</id>
      <title>${feed.title}</title>
      <subtitle>${feed.description}</subtitle>
      <link href="${origin}/" rel="self" />
      <updated>${feed.lastModified}</updated>
      <author>
        <name>${feed.author.name}</name>
        <email>${feed.author.email}</email>
      </author>

      ${feed.entries.map((entry) => `<entry>
        <id>${entry.href}</id>
        <title>${entry.title}</title>
        <summary>${entry.description}</summary>
        <link href="${origin}/${entry.href}" rel="self" />
        <link rel="alternate" type="text/html" href="${origin}/${entry.href}"/>
        <published>${entry.lastModified}</published>
        <updated>${entry.lastModified}</updated>
      </entry>`).join("")}
    </feed>`,
    {
      headers: {
        "Content-Type": "application/xml",
      },
    },
  );
}

const routes = {
  "GET@/": home,
  "GET@/favicon.ico": () => new Response(),
  "GET@/atom.xml": atom,
  "GET@/index.(xsl|html)": (request, env) => {
    const url = new URL(request.url);
    url.pathname = `/static${url.pathname}`;
    return env.ASSETS.fetch(new Request(url));
  },
  "GET@/codicon.svg": () => {
    return fetch("https://unpkg.com/@vscode/codicons/dist/codicon.svg");
  },
};

export default {
  fetch: router(routes),
};
