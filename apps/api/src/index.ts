import { app } from "./app";

const port = Number(process.env.PORT || 8081);
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[api] http://localhost:${port}`);
  console.log(`[api] listening on ${host}:${port}`);
});
