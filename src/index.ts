import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { weatherRoutes } from "./routes/weather.routes";

const app = new Elysia()
  .use(cors())
  .use(weatherRoutes)
  .get("/", () => "Multi-Weather Aggregator API")
  .listen(Number(process.env.PORT) || 3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
