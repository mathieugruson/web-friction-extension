document.addEventListener("DOMContentLoaded", () => {
  const urlInput = document.getElementById("urlInput");
  const addUrlButton = document.getElementById("addUrl");
  const blockedList = document.getElementById("blockedList");
  const toggleButton = document.getElementById("toggle-removal");
  const hiddenElementsList = document.getElementById("hidden-elements");


  // PART OF THE CODE WHERE I LOAD MY POP-UP CONTENT
  // Load existing blocked URLs

  console.log('c1')

  chrome.storage.sync.get(["blockedUrls"], (data) => {
    const urls = data.blockedUrls || [];
    urls.forEach((url) => addBlockedUrlToList(url));
  });

  chrome.storage.sync.get(["removedElements"], async (data) => {
    console.log('get URL 1')
    await chrome.runtime.sendMessage(
      { action: "getTabUrl", enabled: true }, // Message to the background script
      (response) => {
        console.log("Response from background:", response);
        const elements = data.removedElements?.[url] || [];
        console.log('elements ', elements)
        elements.forEach((element) => addHiddenElementToList(element));
      }
    );

  });

  chrome.storage.sync.get(["removalEnabled"], (data) => {
    const isEnabled = data.removalEnabled || false; // Default to false
    toggleButton.dataset.enabled = isEnabled;
    toggleButton.textContent = isEnabled ? "Disable Removal" : "Enable Removal";

    // Notify the background script of the current state
    console.log('isEnabled ', isEnabled)
    chrome.runtime.sendMessage({ action: "toggleRemoval", enabled: isEnabled });
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

  function addHiddenElementToList(url) {
    const li = document.createElement("li");
    li.textContent = url;

    const removeHiddenelementButton = document.createElement("button");
    removeHiddenelementButton.textContent = "Remove";
    // removeHiddenelementButton.addEventListener("click", () => {
    //   removeHiddenElement(url);
    // });

    li.appendChild(removeButton);
    hiddenElementsList.appendChild(li);
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
  
    // Save the state in storage
    chrome.storage.sync.set({ removalEnabled: newState });
    
    chrome.runtime.sendMessage({ action: "toggleRemoval", enabled: newState });
  });
  

  // Load hidden elements
  function loadHiddenElements() {
    chrome.storage.sync.get(["removedElements"], (data) => {
      const url = new URL(window.location.href).origin;
      const elements = data.removedElements?.[url] || [];
      hiddenElementsList.innerHTML = ""; // Clear current list
  
      elements.forEach((element, index) => {
        const listItem = document.createElement("li");
        listItem.textContent = element.name || `Element ${index + 1}`;
  
        const restoreButton = document.createElement("button");
        restoreButton.textContent = "Restore";
        restoreButton.addEventListener("click", () => {
          restoreElement(element.path);
        });
  
        listItem.appendChild(restoreButton);
        hiddenElementsList.appendChild(listItem);
      });
    });
  }

    // Function to restore an element
    function restoreElement(path) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "restoreElement", path });
        }
      });
  
      // Remove the element from storage
      chrome.storage.sync.get(["removedElements"], (data) => {
        const url = new URL(window.location.href).origin;
        const elements = data.removedElements?.[url] || [];
        const updatedElements = elements.filter((el) => el.path !== path);
  
        chrome.storage.sync.set({ removedElements: { ...data.removedElements, [url]: updatedElements } }, () => {
          loadHiddenElements(); // Refresh the list
        });
      });
    }
  
    // Listen for updates from the content script
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "updateHiddenElements") {
        console.log("Hidden elements updated:", message.element);
    
        // Reload the hidden elements list to reflect the changes
        loadHiddenElements();
      }
    });

    loadHiddenElements();


});
