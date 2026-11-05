export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    if (typeof dns?.setDefaultResultOrder === "function") {
      dns.setDefaultResultOrder("ipv4first");
    }
  }
}
