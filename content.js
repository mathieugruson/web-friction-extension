let removalEnabled = false;

// Store references to the event handlers
let mouseoverHandler = null;
let clickHandler = null;



// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message received in content script:", message);

  if (message.action === "toggleRemoval") {
    removalEnabled = message.enabled;
    console.log("Removal mode updated:", removalEnabled);

    if (removalEnabled) {
      enableRemovalMode(); // Attach event listeners
    } else {
      disableRemovalMode(); // Detach event listeners
    }

    // alert(`Element removal ${removalEnabled ? "enabled" : "disabled"}.`);
    sendResponse({ status: "success", enabled: removalEnabled });
  }

  else if (message.action === "restoreElement") {
    restoreElement(message.path);
    sendResponse({ status: "success" }); }
    
  else if (message.action === "getTabUrl") {
      const url = window.location.origin; // Get the origin of the page where the content script runs
      console.log('get URL 3 ', url)
      sendResponse({ url });
    }  else {

    console.warn("Unknown action:", message.action);
    sendResponse({ status: "error", error: "Unknown action" });
  }

  
});

// Function to enable removal mode (attach event listeners)
function enableRemovalMode() {
  console.log("Enabling removal mode...");

  // Define the handlers
  mouseoverHandler = (event) => {
    if (!removalEnabled) return;

    const element = event.target;

    // Highlight the element
    element.style.outline = "2px solid red";

    // Remove highlight when mouse leaves
    element.addEventListener(
      "mouseout",
      () => {
        element.style.outline = "";
      },
      { once: true }
    );
  };

  function getUniqueSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    const path = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let selector = element.nodeName.toLowerCase();
      if (element.className) {
        selector += `.${Array.from(element.classList).join('.')}`;
      }
      path.unshift(selector);
      element = element.parentNode;
    }
    return path.join(" > ");
  }
  

  clickHandler = (event) => {
    if (!removalEnabled) return;

    // Check if the clicked element is part of the extension UI
    if (event.target.closest("#extension-icon")) return;

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    // Save the element's path and hide it
    element.style.display = "none";


  chrome.storage.sync.get(["removedElements"], (data) => {
      const url = window.location.href;
      const removedElements = data.removedElements || {};
      if (!removedElements[url]) {
        removedElements[url] = [];
      }
      const path = getUniqueSelector(element); // Define or implement a function to get a unique selector for the element
      removedElements[url].push({ path, name: element.tagName || "Unknown" });
      
      chrome.storage.sync.set({ removedElements }, () => {
        // Notify the popup of the new hidden element
        // chrome.runtime.sendMessage({ action: "updateHiddenElements", element: { path, name: elementName } });
      });
    });

  };

  // Attach the handlers
  document.addEventListener("mouseover", mouseoverHandler);
  document.addEventListener("click", clickHandler);
}

// Function to disable removal mode (detach event listeners)
function disableRemovalMode() {
  console.log("Disabling removal mode...");

  // Remove the handlers
  if (mouseoverHandler) {
    document.removeEventListener("mouseover", mouseoverHandler);
    mouseoverHandler = null;
  }

  if (clickHandler) {
    document.removeEventListener("click", clickHandler);
    clickHandler = null;
  }
}

// // Handle the Spacebar key to disable removal mode
// document.addEventListener("keydown", (event) => {
//   // Check if Spacebar is pressed and removal mode is enabled
//   if (event.code === "Space" && removalEnabled) {
//     event.preventDefault(); // Prevent default space behavior (e.g., page scrolling)

//     removalEnabled = false; // Disable the mode
//     alert("Element removal mode disabled.");

//     // Clean up event listeners for red outline mode
//     disableRemovalMode();

//     // Update the state in storage
//     chrome.storage.sync.set({ removalEnabled: false }, () => {
//       console.log("Removal mode disabled in storage.");
//     });

//     // Notify other parts of the extension (popup or background)
//     chrome.runtime.sendMessage({ action: "toggleRemoval", enabled: false }, (response) => {
//       console.log("Removal mode state updated via message:", response);
//     });
//   }
// });



// Function to restore a hidden element
function restoreElement(path) {
  const element = document.querySelector(path);
  if (element) {
    element.style.display = "";
    alert("Element restored.");
  }
}

// Function to apply hidden elements on page load
function applyHiddenElements() {
  chrome.storage.sync.get(["removedElements"], (data) => {
    const url = window.location.href;
    const removedElements = data.removedElements || {};
    const elementsToHide = removedElements[url] || [];

    elementsToHide.forEach((item) => {
      // Ensure we use the `path` property from the stored object
      const element = document.querySelector(item.path);
      if (element) {
        element.style.display = "none";
      }
    });
  });
}

// Apply hidden elements when the page loads
applyHiddenElements();
