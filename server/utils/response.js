export const successResponse = (
  res,
  message = "Success",
  data = {},
  status = 200,
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

/**
 * `code` ঐচ্ছিক — দিলে ক্লায়েন্ট নিজের ভাষায় লেখাটা দেখাতে পারে।
 *
 * ব্যবহারকারী যে ভুলগুলো চোখে দেখেন (লগইন, রেজিস্টার, ডিপোজিট) সেখানে
 * কোড দেওয়া হয়; ভিতরের কারিগরি ভুলে দরকার নেই, সেগুলো ইংরেজিই থাকে।
 * কোড না চিনলে ক্লায়েন্ট এই `message` টাই দেখায়, তাই কোড যোগ করা
 * পুরোনো কোনো কিছু ভাঙে না।
 */
export const errorResponse = (
  res,
  message = "Something went wrong",
  status = 500,
  code = "",
) => {
  return res.status(status).json({
    success: false,
    message,
    ...(code ? { code } : {}),
  });
};
