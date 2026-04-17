async function run() {
  const res = await fetch("http://localhost:3000/api/auth/superadmin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "superadmin@festportal.com", password: "superadmin123" })
  });
  console.log("Login:", res.status);
  const cookie = res.headers.get("set-cookie");
  
  const pending = await fetch("http://localhost:3000/api/superadmin/admins/pending", {
    headers: { "Cookie": cookie }
  });
  console.log("Pending:", pending.status, await pending.text());
  
  const stats = await fetch("http://localhost:3000/api/superadmin/stats", {
    headers: { "Cookie": cookie }
  });
  console.log("Stats:", stats.status, await stats.text());
}
run();
