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
    // Clone the document to avoid modifying the actual page
    const docClone = document.documentElement.cloneNode(true);
    
    // We need to work with the clone. However, cloneNode does not resolve relative URLs automatically
    // unlike the live DOM properties (.href, .src).
    // So for fixing links, it's actually better to map the live DOM elements by index or similar,
    // OR just use the Logic provided by the user which uses `document.querySelectorAll`.
    // BUT, the user wants to COPY the HTML. If we modify the live DOM, it changes what the user sees.
    // That might be undesirable.
    // The user's prompt said: "I usually ... click into it's html and I choose 'copy outer html'". 
    // And "Before I copy ... I usually have these 3 option".
    // This implies they run these commands on the live console, modifying the page, then copy.
    
    // Safety check: if we modify the live page, the user might lose state.
    // A better approach is to perform operations on a deep clone if possible.
    // However, `e.href = e.href` relies on the browser resolving the relative path against the current location.
    // This works on the live DOM. On a disconnected node, it might not work as expected unless we manually handle base URI.
    
    // Let's operate on the CLONE to be safe and clean.
    // To make `e.href = e.href` work on a clone, we can just resolve it manually using the document.baseURI.
    
    const baseUri = document.baseURI;
  
    if (removeScripts) {
      // [...document.scripts].forEach(e => e.remove());
      const scripts = docClone.querySelectorAll('script');
      scripts.forEach(e => e.remove());
    }
  
    if (fixHrefs) {
      // [...document.querySelectorAll('[href]:not([href^="http"])')].forEach(e => {e.href = e.href});
      const elementsWithHref = docClone.querySelectorAll('[href]:not([href^="http"])');
      elementsWithHref.forEach(e => {
        // Resolve absolute URL
        try {
            const rawHref = e.getAttribute('href');
            // If it's already absolute (but didn't start with http, e.g. ftp:// or //), careful.
            // The selector :not([href^="http"]) captures relative paths AND things like 'mailto:', 'tel:', '//cdn...'
            
            // Replicating user logic: e.href = e.href. 
            // In a clone, e.href property gives the attribute value, NOT the resolved URL (in some browsers/contexts) 
            // or might default to empty if not connected. 
            // actually, for an element not in DOM, anchor.href usually returns resolved URL if base is valid? 
            // Let's use the URL API to be robust.
            
            if (rawHref) {
                const absoluteUrl = new URL(rawHref, baseUri).href;
                e.setAttribute('href', absoluteUrl);
            }
        } catch (err) {
            // Ignore invalid URLs
        }
      });
    }
  
    if (fixSrcs) {
      // [...document.querySelectorAll('[src]:not([src^="http"])')].forEach(e => {e.src = e.src});
      const elementsWithSrc = docClone.querySelectorAll('[src]:not([src^="http"])');
      elementsWithSrc.forEach(e => {
          try {
            const rawSrc = e.getAttribute('src');
            if (rawSrc) {
                const absoluteUrl = new URL(rawSrc, baseUri).href;
                e.setAttribute('src', absoluteUrl);
            }
          } catch (err) {
              // Ignore
          }
      });
    }
  
    return docClone.outerHTML;
  }
