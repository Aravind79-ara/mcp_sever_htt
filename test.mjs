import { HttpClientServer } from "./server.mjs";

const test = async () => {
  const s = new HttpClientServer();

  const res = await s.handleHttpGet({
    url: "https://jsonplaceholder.typicode.com/posts/1",
  });

  console.log("Response:\n", res.content[0].text);
};

test();
