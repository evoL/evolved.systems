const { MatrixClient } = require("matrix-blog");
const fetch = require("node-fetch");
const Cache = require("@11ty/eleventy-cache-assets");

function cachingFetch(url, options) {
  if (!options) options = {};

  // Do not cache other requests than GET.
  if (options.method && options.method.toLowerCase() !== "get") {
    return fetch(url, options);
  }

  return Cache(url, {
    duration: "1h",
    fetchOptions: options,
  }).then((buffer) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(JSON.parse(buffer.toString("utf8"))),
    text: () => Promise.resolve(buffer.toString("utf8")),
  }));
}

function getMatrixClient() {
  const client = new MatrixClient(
    process.env.MATRIX_SERVER_NAME,
    process.env.MATRIX_HOMESERVER_URL,
    cachingFetch
  );
  client.setAccessToken(process.env.MATRIX_ACCESS_TOKEN);
  return client;
}

module.exports = { getMatrixClient };
