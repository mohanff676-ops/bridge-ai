import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("BRIDGE AI project has required files", () => {
  const requiredFiles = [
    "package.json",
    "server.js",
    "vite.config.js",
    "src/App.jsx",
    "src/App.css",
    "api/analyze.js"
  ];

  for (const file of requiredFiles) {
    assert.equal(
      fs.existsSync(path.join(root, file)),
      true,
      `${file} should exist`
    );
  }
});

test("API key is protected from Git", () => {
  const gitignore = fs.readFileSync(
    path.join(root, ".gitignore"),
    "utf8"
  );

  assert.match(gitignore, /\.env/);
  assert.match(gitignore, /node_modules/);
});

test("package contains required scripts", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
  );

  assert.equal(typeof pkg.scripts.build, "string");
  assert.equal(typeof pkg.scripts.lint, "string");
  assert.equal(typeof pkg.scripts.test, "string");
});

test("BRIDGE AI frontend contains accessibility support", () => {
  const app = fs.readFileSync(
    path.join(root, "src/App.jsx"),
    "utf8"
  );

  assert.match(app, /aria-label/);
  assert.match(app, /aria-live/);
});

test("BRIDGE AI uses the Gemini API endpoint", () => {
  const app = fs.readFileSync(
    path.join(root, "src/App.jsx"),
    "utf8"
  );

  assert.match(app, /\/api\/analyze/);
});