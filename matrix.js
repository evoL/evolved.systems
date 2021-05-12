const { MatrixClient } = require("matrix-blog");
const fetch = require("node-fetch");

function getMatrixClient() {
  const client = new MatrixClient(
    process.env.MATRIX_SERVER_NAME,
    process.env.MATRIX_HOMESERVER_URL,
    fetch
  );
  client.setAccessToken(process.env.MATRIX_ACCESS_TOKEN);
  return client;
}

module.exports = { getMatrixClient };
