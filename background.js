console.log("Dynamic Redirect Extension Initialized");

// Helper to update dynamic rules
async function updateRules(blockedUrls) {
  try {
    console.log("Updating rules with blocked URLs:", blockedUrls);

    // Get existing rules
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingRuleIds = existingRules.map((rule) => rule.id);

    // Remove existing rules to prevent duplication
    if (existingRuleIds.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: existingRuleIds });
      console.log("Existing rules removed successfully.");
    }

    // Create new rules
    const rules = blockedUrls.map((url, index) => ({
      id: index + 1, // Ensure unique ID for each rule
      priority: 1,
      action: {
        type: "redirect",
        redirect: { url: "https://www.google.com" },
      },
      condition: {
        regexFilter: `^${url}(/|)$`, // Matches only the base URL or the exact path
        resourceTypes: ["main_frame"],
      },
    }));

    // Add new rules
    if (rules.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({ addRules: rules });
      console.log("Rules updated successfully!");
    } else {
      console.log("No URLs provided to block.");
    }
  } catch (error) {
    console.error("Error updating rules:", error);
  }
}

// Load initial blocked URLs from storage and update rules
chrome.storage.sync.get(["blockedUrls"], (data) => {
  const blockedUrls = data.blockedUrls || [];
  console.log("Loaded initial blocked URLs:", blockedUrls);
  updateRules(blockedUrls);
});

// Handle runtime messages (e.g., from the popup)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('receive message from frontend')
  console.log('message ', message)
  console.log('sender ', sender)

  if (message.command === "updateBlockedUrls") {
    const blockedUrls = message.blockedUrls;
    console.log("Received new blocked URLs:", blockedUrls);

    // Save the updated URLs to storage and update rules
    chrome.storage.sync.set({ blockedUrls }, () => {
      console.log("Blocked URLs saved to storage:", blockedUrls);

      updateRules(blockedUrls)
        .then(() => {
          sendResponse({ status: "success", updatedUrls: blockedUrls });
        })
        .catch((error) => {
          console.error("Failed to update rules:", error);
          sendResponse({ status: "error", error: error.message });
        });
    });

    // Indicate the response will be sent asynchronously
    return true;
  }

  if (message.action === "toggleRemoval") {
    // Query the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Send a message to the content script in the active tab
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          console.log("Response from content script:", response);
          sendResponse(response); // Relay the response back to the popup if needed
        });
      } else {
        console.error("No active tab found.");
        sendResponse({ status: "error", error: "No active tab found" });
      }
    });

    // Indicate that the response will be sent asynchronously
    return true;
  }

  if (message.action === "getTabUrl") {
    console.log("Getting active tab URL...");

    // Query the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log("Tabs retrieved:", tabs);

      if (tabs.length > 0) {
        // Send a message to the content script in the active tab
        chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
          console.log("Response from content script:", response);
          sendResponse(response); // Relay the response back to the popup
        });
      } else {
        console.error("No active tab found.");
        sendResponse({ status: "error", error: "No active tab found" });
      }
    });

    // Must return true to indicate asynchronous response
    return true;
  } else {
    sendResponse({ status: "error", error: "Unknown action" });
  }

  // Unknown command handler
  console.warn("Received unknown command:", message.action);
  sendResponse({ status: "error", error: "Unknown command" });
});

// Event listener to handle when the extension is updated or reloaded
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("Extension installed for the first time.");
  } else if (details.reason === "update") {
    console.log("Extension updated to a new version.");
  }
});
