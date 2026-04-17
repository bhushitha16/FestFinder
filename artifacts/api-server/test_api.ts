// use global fetch
async function run() {
  const loginRes = await fetch("http://localhost:5000/api/auth/superadmin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "superadmin@festportal.com", password: "superadmin123" })
  });
  console.log("Login:", loginRes.status);
  
  const cookieHeader = loginRes.headers.get('set-cookie');
  const cookie = cookieHeader?.split(';')[0];
  
  const pending = await fetch("http://localhost:5000/api/superadmin/admins/pending", {
    headers: { "Cookie": cookie }
  });
  console.log("Pending Status:", pending.status);
  const pendingJson = await pending.json();
  console.log("Pending Data:", JSON.stringify(pendingJson, null, 2));

  const admins = await fetch("http://localhost:5000/api/superadmin/colleges", {
    headers: { "Cookie": cookie }
  });
  console.log("colleges Status:", admins.status);
  const adminsJson = await Object.keys(await admins.json()).length;
  console.log("colleges Data count:", adminsJson);
}
run();
