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
  } else {
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

  clickHandler = (event) => {
    if (!removalEnabled) return;

    // Check if the clicked element is part of the extension UI
    if (event.target.closest("#extension-icon")) return;

    event.preventDefault();
    event.stopPropagation();

    const element = event.target;

    // Save the element's path and hide it
    const path = getElementPath(element);
    saveElementPath(path);
    element.style.display = "none";

    alert("Element hidden and path saved.");
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

// Handle the Spacebar key to disable removal mode
document.addEventListener("keydown", (event) => {
  // Check if Spacebar is pressed and removal mode is enabled
  if (event.code === "Space" && removalEnabled) {
    event.preventDefault(); // Prevent default space behavior (e.g., page scrolling)

    removalEnabled = false; // Disable the mode
    alert("Element removal mode disabled.");

    // Clean up event listeners for red outline mode
    disableRemovalMode();

    // Update the state in storage
    chrome.storage.sync.set({ removalEnabled: false }, () => {
      console.log("Removal mode disabled in storage.");
    });

    // Notify other parts of the extension (popup or background)
    chrome.runtime.sendMessage({ action: "toggleRemoval", enabled: false }, (response) => {
      console.log("Removal mode state updated via message:", response);
    });
  }
});

// Function to generate a unique CSS path for an element
function getElementPath(el) {
  if (!el) return "";
  const parts = [];
  while (el.parentElement) {
    let selector = el.tagName.toLowerCase();
    if (el.id) {
      selector += `#${el.id}`;
      parts.unshift(selector);
      break;
    } else {
      let siblingIndex = 0;
      let sibling = el;
      while ((sibling = sibling.previousElementSibling) != null) {
        siblingIndex++;
      }
      selector += `:nth-child(${siblingIndex + 1})`;
    }
    parts.unshift(selector);
    el = el.parentElement;
  }
  return parts.join(" > ");
}

// Function to save the element path
function saveElementPath(path) {
  chrome.storage.sync.get(["removedElements"], (data) => {
    const url = window.location.href;
    const removedElements = data.removedElements || {};
    if (!removedElements[url]) {
      removedElements[url] = [];
    }
    if (!removedElements[url].includes(path)) {
      removedElements[url].push(path);
    }
    chrome.storage.sync.set({ removedElements });
  });
}

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

    elementsToHide.forEach((path) => {
      const element = document.querySelector(path);
      if (element) {
        element.style.display = "none";
      }
    });
  });
}

// Apply hidden elements when the page loads
applyHiddenElements();
