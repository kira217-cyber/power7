import { useEffect, useState } from "react";

import api from "../../api/axios";

/**
 * সাহায্য কেন্দ্রের লেখা — admin এর `/api/help`, মোবাইল/ডেস্কটপ আলাদা
 * (admin প্রতিটা লেখায় ঠিক করেন কোথায় দেখাবে)। লগইন লাগে না।
 */
export const useHelp = (platform = "mobile") => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get("/api/help", { params: { platform } })
      .then(({ data }) => alive && setArticles(data?.data?.articles || []))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [platform]);

  return { articles, loading };
};

export default useHelp;
