fetch("http://localhost:8081/").then(r => r.text()).then(text => {
  if (text.includes("Cannot read properties of undefined (reading 'fetch')")) {
    console.log("ERROR STILL PRESENT");
  } else {
    console.log("SUCCESS");
  }
  process.exit();
}).catch(console.error);
