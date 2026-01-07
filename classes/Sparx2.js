// classes/Sparx.js
import { exec } from "child_process";

function openInBrowser(url) {
  return new Promise((resolve, reject) => {
    let cmd;
    if (process.platform === "win32") {
      cmd = `start "" "${url}"`;
    } else if (process.platform === "darwin") {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => (err ? reject(err) : resolve()));
  });
}

class Sparx {
  constructor(options = {}) {
    // Try to pull slug from options.school.slug or options.schoolSlug
    this.schoolSlug =
      options.school?.slug ||
      options.schoolSlug ||
      "holte-school"; // <- change if needed
  }

  async login() {
    const url = `https://www.sparxmaths.uk/student/?s=${encodeURIComponent(
      this.schoolSlug
    )}`;

    console.log("Opening Sparx in your browser:");
    console.log(url);
    await openInBrowser(url);
    console.log("Please log in manually in the browser.");
  }

  // Stub methods so other code doesn't crash,
  // but they don't actually do anything.
  async logout() {
    console.log("Manual mode: nothing to log out programmatically.");
  }

  async _refreshToken() {
    console.log("Manual mode: no token refresh (you logged in yourself).");
  }
}

export { Sparx };
