/**
 * OraclePay গেটওয়েতে POST — অটো ডিপোজিট আর অটো উইথড্র দুটোই এটা দিয়ে।
 *
 * টোকেন যায় `X-Opay-Business-Token` হেডারে (admin প্যানেল থেকে বসানো)।
 * ২০ সেকেন্ডে সাড়া না এলে বাদ। গেটওয়ে ভুল বললে তার নিজের বার্তাটাই
 * error হয়ে ওঠে, যাতে admin এর "last error" এ আসল কারণটা দেখা যায়।
 */
export const gatewayPost = async (url, token, body) => {
  if (!url) throw new Error("Gateway URL is not configured on the server");

  const res = await fetch(url, {
    method: "POST",
    headers: { "X-Opay-Business-Token": String(token || "").trim(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) throw new Error(data?.message || `Gateway answered ${res.status}`);
  return data;
};
