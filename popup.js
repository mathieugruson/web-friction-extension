document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("urlInput");
  const addUrlButton = document.getElementById("addUrl");
  const blockedList = document.getElementById("blockedList");
  const toggleButton = document.getElementById("toggle-removal");
  const hiddenElementsList = document.getElementById("hidden-elements");

  // Load existing blocked URLs
  chrome.storage.sync.get(["blockedUrls"], (data) => {
    const urls = data.blockedUrls || [];
    urls.forEach((url) => addBlockedUrlToList(url));
  });

  // Add URL to the block list and storage
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
        addBlockedUrlToList(url);
        updateRedirectRules(urls);
        urlInput.value = ""; // Clear input field
      });
    });
  });

  // Add blocked URL to the display list
  function addBlockedUrlToList(url) {
    const li = document.createElement("li");
    li.textContent = url;

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", () => {
      removeBlockedUrl(url);
    });

    li.appendChild(removeButton);
    blockedList.appendChild(li);
  }

  // Remove blocked URL from the list and storage
  function removeBlockedUrl(url) {
    chrome.storage.sync.get(["blockedUrls"], (data) => {
      const urls = data.blockedUrls || [];
      const updatedUrls = urls.filter((item) => item !== url);

      chrome.storage.sync.set({ blockedUrls: updatedUrls }, () => {
        const listItem = Array.from(blockedList.children).find(
          (li) => li.textContent.includes(url)
        );
        if (listItem) listItem.remove();
        updateRedirectRules(updatedUrls);
      });
    });
  }

  // Update redirect rules in the background script
  function updateRedirectRules(urls) {
    chrome.runtime.sendMessage({ command: "updateBlockedUrls", blockedUrls: urls });
  }

  // Toggle Element Removal
  toggleButton.addEventListener("click", () => {
    const isEnabled = toggleButton.dataset.enabled === "true";
    const newState = !isEnabled;
    toggleButton.dataset.enabled = newState;
    toggleButton.textContent = newState ? "Disable Removal" : "Enable Removal";

    chrome.runtime.sendMessage({ action: "toggleRemoval", enabled: newState });
  });

  // Load hidden elements
  function loadHiddenElements() {
    chrome.storage.sync.get(["removedElements"], (data) => {
      const url = new URL(window.location.href).origin;
      const elements = data.removedElements?.[url] || [];
      hiddenElementsList.innerHTML = "";

      elements.forEach((path) => {
        const listItem = document.createElement("li");
        listItem.textContent = path;

        const restoreButton = document.createElement("button");
        restoreButton.textContent = "Restore";
        restoreButton.addEventListener("click", () => {
          chrome.runtime.sendMessage({ action: "restoreElement", path });
        });

        listItem.appendChild(restoreButton);
        hiddenElementsList.appendChild(listItem);
      });
    });
  }

  // Refresh the hidden elements list on load
  loadHiddenElements();
});
