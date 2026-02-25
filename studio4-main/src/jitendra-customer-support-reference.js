// Snapshot reference of the initial CRA scaffold from jitendra-customer-support branch.
import React from "react";
import logo from "./logo.svg";
import "./App.css";

/**
 * Snapshot of the jitendra-customer-support branch (initial CRA scaffold).
 * Keeping this here so we can reference or diff it without checking out the branch.
 */
export default function JitendraCustomerSupportReference() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}
