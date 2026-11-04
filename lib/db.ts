import { Resolver } from "node:dns/promises";
import mongoose from "mongoose";

const DATABASE = "sistema-escala";

const resolver = new Resolver();
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

const cached: MongooseCache = globalForMongoose.mongooseCache ?? {
  conn: null,
  promise: null,
};

globalForMongoose.mongooseCache = cached;

async function uriParaConexao(uri: string) {
  if (!uri.startsWith("mongodb+srv://")) {
    return uri;
  }

  const parsed = new URL(uri);
  const records = await resolver.resolveSrv(
    `_mongodb._tcp.${parsed.hostname}`,
  );

  if (records.length === 0) {
    throw new Error("O DNS público não encontrou os servidores do cluster.");
  }

  const hosts = records
    .map((record) => `${record.name.replace(/\.$/, "")}:${record.port}`)
    .join(",");

  const params = new URLSearchParams(parsed.search);

  try {
    const txt = await resolver.resolveTxt(parsed.hostname);
    const txtParams = new URLSearchParams(txt.flat().join(""));
    txtParams.forEach((value, key) => {
      if (!params.has(key)) {
        params.set(key, value);
      }
    });
  } catch {
    // O cluster segue acessível com TLS mesmo sem o registro TXT.
  }

  if (!params.has("tls") && !params.has("ssl")) {
    params.set("tls", "true");
  }

  const user = encodeURIComponent(decodeURIComponent(parsed.username));
  const password = encodeURIComponent(decodeURIComponent(parsed.password));
  const auth = user ? `${user}:${password}@` : "";

  return `mongodb://${auth}${hosts}/?${params.toString()}`;
}

export async function connectDB() {
  const uri = process.env.MONGO_URL;

  if (!uri || uri.includes("<db_password>")) {
    throw new Error(
      "Defina MONGO_URL em .env.local com a senha do MongoDB no lugar de <db_password>.",
    );
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = uriParaConexao(uri).then((uriDireta) =>
      mongoose.connect(uriDireta, { dbName: DATABASE }),
    );
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    throw error;
  }

  return cached.conn;
}
