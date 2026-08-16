const response = await fetch("http://localhost:3000/api/ask", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Hello",
    history: []
  })
});
const data = await response.json();
console.log(data);
