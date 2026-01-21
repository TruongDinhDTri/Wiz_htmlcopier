document.getElementById('copyBtn').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const removeScripts = document.getElementById('removeScripts').checked;
    const fixHrefs = document.getElementById('fixHrefs').checked;
    const fixSrcs = document.getElementById('fixSrcs').checked;
  
    statusDiv.textContent = "Processing...";
  
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
      if (!tab) {
        statusDiv.textContent = "Error: No active tab found.";
        return;
      }
  
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getProcessedHTML,
        args: [removeScripts, fixHrefs, fixSrcs],
      });
  
      if (result && result[0] && result[0].result) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result[0].result);
        statusDiv.textContent = "Copied to clipboard!";
        statusDiv.classList.add('visible');
        setTimeout(() => {
             statusDiv.classList.remove('visible');
             // Clear text after fade out to keep layout stable if needed, but opacity handles visibility
             setTimeout(() => statusDiv.textContent = "", 500); 
        }, 2000);
      } else {
        statusDiv.textContent = "Failed to retrieve HTML.";
        statusDiv.classList.add('visible');
      }
    } catch (err) {
      console.error(err);
      statusDiv.textContent = "Error: " + err.message;
    }
  });
  
  // This function runs in the context of the web page
  function getProcessedHTML(removeScripts, fixHrefs, fixSrcs) {
    if (removeScripts) {
      [...document.scripts].forEach(e => e.remove());
    }
  
    if (fixHrefs) {
      [...document.querySelectorAll('[href]:not([href^="http"])')].forEach(e => {e.href = e.href});
    }
  
    if (fixSrcs) {
      [...document.querySelectorAll('[src]:not([src^="http"])')].forEach(e => {e.src = e.src});
    }
  
    return document.documentElement.outerHTML;
  }
