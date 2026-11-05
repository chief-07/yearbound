import dns from "node:dns";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (typeof dns?.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  }
}
