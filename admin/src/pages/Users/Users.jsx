import React from "react";

import UserList from "./UserList";

/** সাধারণ প্লেয়ারের তালিকা */
const Users = () => (
  <UserList
    kind="users"
    title="Users"
    subtitle="Everyone who plays on the client site."
  />
);

export default Users;
