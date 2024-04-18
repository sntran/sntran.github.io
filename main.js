import { router } from "./lib/router.js";

if (!("HTMLRewriter" in globalThis)) {
  const { HTMLRewriter } = await import("npm:@worker-tools/html-rewriter");
  globalThis.HTMLRewriter = HTMLRewriter;
}

function home(request) {
  const { pathname } = new URL(request.url);

  const rewriter = new HTMLRewriter();
  rewriter.on("feed", {
    // Prepends processing instruction to load associated XSLT stylesheet.
    element(element) {
      const options = { html: true };
      element.before(`<?xslt-param name="html" value="/index.html"?>`, options)
      element.before(`<?xml-stylesheet type="text/xsl" href="/index.xsl" ?>`, options);
    },
  });

  return rewriter.transform(feed(request));
}

function feed(request) {
  const { origin = "https://sntran.com" } = new URL(request.url);

  return new Response(`<?xml version="1.0" encoding="UTF-8" ?>
  <feed xmlns="http://www.w3.org/2005/Atom">
    <id>${origin}</id>
    <title>Trần Nguyễn Sơn's Space</title>
    <subtitle>Personal space for Trần Nguyễn Sơn</subtitle>
    <link href="${origin}/" rel="self" />
    <updated>${new Date().toISOString()}</updated>
    <author>
      <name>Trần Nguyễn Sơn</name>
      <email>contact@sntran.com</email>
    </author>

    <entry>
      <id>README.md</id>
      <title>About</title>
      <summary>About Me</summary>
      <link href="${origin}/README.md" rel="self" />
      <link rel="alternate" type="text/html" href="${origin}/README.md"/>
      <published>2003-11-09T17:23:02Z</published>
		  <updated>2003-12-13T18:30:02Z</updated>
      <content type="xhtml">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <h1>About Me</h1>
        </div>
      </content>
    </entry>

    <entry>
      <id>Projects/README.md</id>
      <title>Projects</title>
      <summary>All projects contributed by me</summary>
      <link href="${origin}/Projects/README.md" rel="self" />
      <link rel="alternate" type="text/html" href="${origin}/Projects/README.md"/>
      <published>2003-11-09T17:23:02Z</published>
		  <updated>2003-12-13T18:30:02Z</updated>
      <content type="xhtml">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <h1>Projects</h1>
        </div>
      </content>
    </entry>

    <entry>
      <id>Projects/Project-A/README.md</id>
      <title>Project A</title>
      <summary>Project A summary</summary>
      <link href="${origin}/Projects/Project-A/README.md" rel="self" />
      <link rel="alternate" type="text/html" href="${origin}/Projects/Project-A/README.md"/>
      <published>2003-11-09T17:23:02Z</published>
		  <updated>2003-12-13T18:30:02Z</updated>
      <content type="xhtml">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <h1>Project A</h1>
        </div>
      </content>
    </entry>

    <entry>
      <id>Projects/Project-A/CHANGELOG.md</id>
      <title>Project A</title>
      <summary>Project A summary</summary>
      <link href="${origin}/Projects/Project-A/CHANGELOG.md" rel="self" />
      <link rel="alternate" type="text/html" href="${origin}/Projects/Project-A/CHANGELOG.md"/>
      <published>2003-11-09T17:23:02Z</published>
		  <updated>2003-12-13T18:30:02Z</updated>
      <content type="xhtml">
        <div xmlns="http://www.w3.org/1999/xhtml">
          <h1>Project A</h1>
        </div>
      </content>
    </entry>
  </feed>`, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}

const routes = {
  "GET@/": home,
  "GET@/atom.xml": feed,
  "GET@/codicon.svg": () => {
    return fetch("https://unpkg.com/@vscode/codicons/dist/codicon.svg");
  }
}

const route = router(routes);

export default {
  fetch: route,
}

// Learn more at https://deno.land/manual/examples/module_metadata#concepts
if (import.meta.main) {
  const env = Deno.env.toObject();

  // Asset serving function similar to CloudFlare.
  env.ASSETS = {
    fetch(request) {
      const { pathname } = new URL(request.url);
      const url = new URL(`./static${pathname}`, import.meta.url);
      return fetch(url);
    },
  }

  Deno.serve((request) => {
    return route(request, env);
  });
}
