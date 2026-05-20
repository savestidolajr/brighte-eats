import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { typeDefs } from "./schema.js";
import { resolvers } from "./resolvers.js";
import { prisma } from "./prisma.js";
import { buildContext, type Context } from "./context.js";

const server = new ApolloServer<Context>({ typeDefs, resolvers });

const port = Number(process.env.PORT ?? 4000);

const { url } = await startStandaloneServer(server, {
  listen: { port },
  context: async ({ req }) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    return buildContext(prisma, ip);
  },
});

console.log(`🚀 Server ready at ${url}`);
