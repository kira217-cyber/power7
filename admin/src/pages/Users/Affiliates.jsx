import React from "react";

import UserList from "./UserList";

/** অ্যাফিলিয়েটের তালিকা — কমিশনের হার ও পাওনা সহ */
const Affiliates = () => (
  <UserList
    kind="affiliates"
    title="Affiliates"
    subtitle="Accounts that earn commission from the players they bring."
  />
);

export default Affiliates;
