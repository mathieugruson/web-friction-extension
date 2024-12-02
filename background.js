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
        urlFilter: url,
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

  // Unknown command handler
  console.warn("Received unknown command:", message.command);
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
