let removalEnabled = false;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleRemoval") {
    removalEnabled = message.enabled;
    alert(`Element removal ${removalEnabled ? "enabled" : "disabled"}.`);
  } else if (message.action === "restoreElement") {
    restoreElement(message.path);
  }
});

// Add hover and click handlers
document.addEventListener("mouseover", (event) => {
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

  // On click, remove the element
  element.addEventListener(
    "click",
    (e) => {
      if (!removalEnabled) return;

      e.preventDefault();
      e.stopPropagation();

      // Save the element's path and hide it
      const path = getElementPath(element);
      saveElementPath(path);
      element.style.display = "none";

      alert("Element hidden and path saved.");
    },
    { once: true }
  );
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
    removedElements[url].push(path);
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
