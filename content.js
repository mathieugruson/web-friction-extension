// Initialize storage for removed elements
chrome.storage.sync.get(["removedElements"], (data) => {
    if (!data.removedElements) {
      chrome.storage.sync.set({ removedElements: {} });
    }
  });
  
  // Add hover and click handlers
  document.addEventListener("mouseover", (event) => {
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
        e.preventDefault();
        e.stopPropagation();
  
        // Save the element's path and remove it
        const path = getElementPath(element);
        saveElementPath(path);
        element.remove();
  
        alert("Element removed and path saved.");
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
  
  // Function to remove saved elements on page load
  function removeSavedElements() {
    chrome.storage.sync.get(["removedElements"], (data) => {
      const url = window.location.href;
      const paths = data.removedElements?.[url] || [];
      paths.forEach((path) => {
        const element = document.querySelector(path);
        if (element) {
          element.remove();
        }
      });
    });
  }
  
  // Remove saved elements on page load
  window.addEventListener("DOMContentLoaded", removeSavedElements);
  