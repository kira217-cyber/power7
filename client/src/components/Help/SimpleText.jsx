import React from "react";

/**
 * admin এর লেখা সাধারণ টেক্সট → অনুচ্ছেদ। নিয়ম তিনটে: ফাঁকা লাইনে নতুন
 * অনুচ্ছেদ, `## ` দিয়ে শুরু লাইন শিরোনাম, `**…**` মোটা। HTML নয় বলে
 * কিছু "ইনজেক্ট" হওয়ার ভয় নেই — React সব লেখা এস্কেপ করে।
 */
const inline = (line, key) =>
  line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={`${key}-${i}`}>{part.slice(2, -2)}</strong> : part,
  );

const SimpleText = ({ text = "", paragraphGap, headingStyle, style }) => (
  <div style={style}>
    {String(text)
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block, i) =>
        block.startsWith("## ") ? (
          <h3 key={i} style={{ fontWeight: 700, margin: `${i ? paragraphGap : 0} 0 0`, ...headingStyle }}>
            {inline(block.slice(3), i)}
          </h3>
        ) : (
          <p key={i} style={{ marginTop: i ? paragraphGap : 0 }}>
            {block.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {inline(line, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        ),
      )}
  </div>
);

export default SimpleText;
