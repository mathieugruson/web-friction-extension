document.addEventListener("DOMContentLoaded", () => {
    const urlInput = document.getElementById("urlInput");
    const addUrlButton = document.getElementById("addUrl");
    const blockedList = document.getElementById("blockedList");
  
    // Load existing blocked URLs
    chrome.storage.sync.get(["blockedUrls"], (data) => {
      const urls = data.blockedUrls || [];
      urls.forEach((url) => addListItem(url));
    });
  
    // Add URL to the list and storage
    addUrlButton.addEventListener("click", () => {
      const url = urlInput.value.trim();
      if (!url) return alert("Please enter a valid URL.");
  
      chrome.storage.sync.get(["blockedUrls"], (data) => {
        const urls = data.blockedUrls || [];
        if (urls.includes(url)) {
          alert("This URL is already blocked.");
          return;
        }
  
        urls.push(url);
        chrome.storage.sync.set({ blockedUrls: urls }, () => {
          addListItem(url);
          updateRedirectRules(urls);
          urlInput.value = "";
        });
      });
    });
  
    // Add list item to display
    function addListItem(url) {
      const li = document.createElement("li");
      li.textContent = url;
      blockedList.appendChild(li);
    }
  
    // Update redirect rules in the background
    function updateRedirectRules(urls) {
      chrome.runtime.sendMessage({ command: "updateBlockedUrls", blockedUrls: urls });
    }
  });
  