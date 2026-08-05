const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
const window = dom.window;
global.window = window;
global.document = window.document;
global.localStorage = { getItem:()=>null, setItem:()=>{} };
// Mock fetch and showToast
global.fetch = async () => {};
window.showToast = console.log;
window.dbQuery = () => [];
window.dbRun = () => {};
window.initDB = async () => {};
window.initTabSwitcher = () => {};
window.initSetupForm = () => {};
window.initCycleForm = () => {};
window.initBackupPanel = () => {};
window.loadCyclesDropdowns = () => {};
window.renderCyclesList = () => {};

const appCode = fs.readFileSync('js/app.js', 'utf8');
const script = window.document.createElement("script");
script.textContent = appCode;
window.document.body.appendChild(script);

try {
  // Manually trigger DOMContentLoaded
  const event = window.document.createEvent('Event');
  event.initEvent('DOMContentLoaded', true, true);
  window.document.dispatchEvent(event);
  
  setTimeout(() => {
    console.log("Testing Download Button...");
    const btn = window.document.getElementById('btn-download-template');
    if(btn) {
      btn.click();
      console.log("Download button clicked");
    } else {
      console.log("Download button NOT FOUND");
    }
  }, 500);
} catch (e) {
  console.error("RUNTIME ERROR:", e);
}
