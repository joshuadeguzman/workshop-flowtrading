import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Each test places real trades that persist to localStorage. Wipe the account
// (and unmount any rendered hooks) between tests so every case starts from a
// clean $100,000 account with an empty trade log.
afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
