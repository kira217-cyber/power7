import React from "react";

/**
 * ল্যান্ডিং পেজের সেকশনের মোড়ক — **ক্লায়েন্ট সাইটের গেম সেকশনের মতো**
 * খাঁজকাটা প্যানেল, বাঁ-উপরে টাইটেল স্ট্রিপ, ডানে ঐচ্ছিক অ্যাকশন।
 *
 * BetChokkor এর অ্যাফিলিয়েটে সেকশনগুলো ছিল মাঝ-বরাবর শিরোনাম + অনেক
 * ফাঁকা জায়গা; POWER7 এর চেহারা আলাদা — কনটেন্ট একটা প্যানেলের
 * ভেতরে বসে, শিরোনাম বাঁয়ে স্ট্রিপে।
 */
const Section = ({ id, title, text, action, children, plain = false }) => {
  const head = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="tb-strip">
          {/* শিরোনামের আগে ছোট সোনালি বার — ক্লায়েন্টের মডালের
              সেকশন শিরোনামে যেমন */}
          <span
            className="shrink-0 rounded-full"
            style={{ width: 4, height: 20, background: "var(--gold)" }}
          />
          <span className="tb-strip__title">{title}</span>
        </div>

        {action}
      </div>

      {text && <p className="tb-lead max-w-3xl">{text}</p>}
    </>
  );

  // কিছু সেকশন (প্রোভাইডার, CTA) প্যানেল ছাড়া পুরো প্রস্থে বসে
  if (plain) {
    return (
      <section id={id} className="tb-section">
        <div className="tb-wrap">
          {head}
          <div className="mt-6">{children}</div>
        </div>
      </section>
    );
  }

  return (
    <section id={id} className="tb-section">
      <div className="tb-wrap">
        <div className="tb-panel">
          {head}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
};

export default Section;
