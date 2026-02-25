// Customer signup page that reuses the Login component in signup mode.
import React from "react";
import Login from "./Login";

export default function Signup(props) {
  return <Login defaultMode="signup" {...props} />;
}
